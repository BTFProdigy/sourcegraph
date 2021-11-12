package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/keegancsmith/sqlf"

	"github.com/sourcegraph/sourcegraph/internal/database/basestore"
	"github.com/sourcegraph/sourcegraph/internal/database/dbutil"
	"github.com/sourcegraph/sourcegraph/internal/timeutil"
	"github.com/sourcegraph/sourcegraph/internal/types"
)

type ExecutorStore interface {
	List(ctx context.Context, args ExecutorStoreListOptions) ([]types.Executor, int, error)
	GetByID(ctx context.Context, id int) (types.Executor, bool, error)
	Heartbeat(ctx context.Context, executor types.Executor) error
	Transact(ctx context.Context) (ExecutorStore, error)
	Done(err error) error
	With(store basestore.ShareableStore) ExecutorStore
	basestore.ShareableStore
}

type executorStore struct {
	*basestore.Store
}

var _ ExecutorStore = (*executorStore)(nil)

// Executors instantiates and returns a new ExecutorStore with prepared statements.
func Executors(db dbutil.DB) ExecutorStore {
	return &executorStore{Store: basestore.NewWithDB(db, sql.TxOptions{})}
}

// ExecutorsWith instantiates and returns a new ExecutorStore using the other store handle.
func ExecutorsWith(other basestore.ShareableStore) ExecutorStore {
	return &executorStore{Store: basestore.NewWithHandle(other.Handle())}
}

func (s *executorStore) With(other basestore.ShareableStore) ExecutorStore {
	return &executorStore{Store: s.Store.With(other)}
}

func (s *executorStore) Done(err error) error {
	return s.Store.Done(err)
}

func (s *executorStore) Transact(ctx context.Context) (ExecutorStore, error) {
	txBase, err := s.Store.Transact(ctx)
	return &executorStore{Store: txBase}, err
}

// scanExecutors reads executor objects from the given row object.
func scanExecutors(rows *sql.Rows, queryErr error) (_ []types.Executor, err error) {
	if queryErr != nil {
		return nil, queryErr
	}
	defer func() { err = basestore.CloseRows(rows, err) }()

	var executors []types.Executor
	for rows.Next() {
		var executor types.Executor
		if err := rows.Scan(
			&executor.ID,
			&executor.Hostname,
			&executor.QueueName,
			&executor.OS,
			&executor.Architecture,
			&executor.ExecutorVersion,
			&executor.SrcCliVersion,
			&executor.GitVersion,
			&executor.DockerVersion,
			&executor.IgniteVersion,
			&executor.FirstSeenAt,
			&executor.LastSeenAt,
		); err != nil {
			return nil, err
		}

		executors = append(executors, executor)
	}

	return executors, nil
}

// scanFirstExecutor scans a slice of executors from the return value of `*Store.query` and returns the first.
func scanFirstExecutor(rows *sql.Rows, err error) (types.Executor, bool, error) {
	executors, err := scanExecutors(rows, err)
	if err != nil || len(executors) == 0 {
		return types.Executor{}, false, err
	}
	return executors[0], true, nil
}

type ExecutorStoreListOptions struct {
	Query  string
	Active bool
	Offset int
	Limit  int
}

// TODO - test
// List returns a set of executor activity records matching the given options.
//
// 🚨 SECURITY: The caller must ensure that the actor is permitted to view executor details
// (e.g., a site-admin).
func (s *executorStore) List(ctx context.Context, opts ExecutorStoreListOptions) (_ []types.Executor, _ int, err error) {
	tx, err := s.Store.Transact(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer func() { err = tx.Done(err) }()

	conds := make([]*sqlf.Query, 0, 2)
	if opts.Query != "" {
		conds = append(conds, makeExecutorSearchCondition(opts.Query))
	}
	if opts.Active {
		conds = append(conds, sqlf.Sprintf("NOW() - h.last_seen_at < '15 minutes'::interval"))
	}

	whereConditions := sqlf.Sprintf("TRUE")
	if len(conds) > 0 {
		whereConditions = sqlf.Join(conds, " AND ")
	}

	totalCount, _, err := basestore.ScanFirstInt(tx.Query(ctx, sqlf.Sprintf(executorStoreListCountQuery, whereConditions)))
	if err != nil {
		return nil, 0, err
	}

	executors, err := scanExecutors(tx.Query(ctx, sqlf.Sprintf(executorStoreListQuery, whereConditions, opts.Limit, opts.Offset)))
	if err != nil {
		return nil, 0, err
	}

	return executors, totalCount, nil
}

const executorStoreListCountQuery = `
-- source: internal/database/executors.go:List
SELECT COUNT(*)
FROM executor_heartbeats h
WHERE %s
`

const executorStoreListQuery = `
-- source: internal/database/executors.go:List
SELECT
	h.id,
	h.hostname,
	h.queue_name,
	h.os,
	h.architecture,
	h.executor_version,
	h.src_cli_version,
	h.git_version,
	h.docker_version,
	h.ignite_version,
	h.first_seen_at,
	h.last_seen_at
FROM executor_heartbeats h
WHERE %s
ORDER BY h.first_seen_at DESC, h.id
LIMIT %s OFFSET %s
`

// makeExecutorSearchCondition returns a disjunction of LIKE clauses against all searchable columns of an executor.
func makeExecutorSearchCondition(term string) *sqlf.Query {
	searchableColumns := []string{
		"h.hostname",
		"h.queue_name",
		"h.os",
		"h.architecture",
		"h.executor_version",
		"h.src_cli_version",
		"h.git_version",
		"h.docker_version",
		"h.ignite_version",
	}

	var termConds []*sqlf.Query
	for _, column := range searchableColumns {
		termConds = append(termConds, sqlf.Sprintf(column+" ILIKE %s", "%"+term+"%"))
	}

	return sqlf.Sprintf("(%s)", sqlf.Join(termConds, " OR "))
}

// TODO - test
// GetByID returns an executor activity record by identifier. If no such record exists, a
// false-valued flag is returned.
//
// 🚨 SECURITY: The caller must ensure that the actor is permitted to view executor details
// (e.g., a site-admin).
func (s *executorStore) GetByID(ctx context.Context, id int) (types.Executor, bool, error) {
	return scanFirstExecutor(s.Query(ctx, sqlf.Sprintf(executorStoreGetByIDQuery, id)))
}

const executorStoreGetByIDQuery = `
-- source: internal/database/executors.go:GetByID
SELECT
	h.id,
	h.hostname,
	h.queue_name,
	h.os,
	h.architecture,
	h.executor_version,
	h.src_cli_version,
	h.git_version,
	h.docker_version,
	h.ignite_version,
	h.first_seen_at,
	h.last_seen_at
FROM executor_heartbeats h
WHERE h.id = %s
`

// Heartbeat updates or creates an executor activity record for a particular executor instance.
func (s *executorStore) Heartbeat(ctx context.Context, executor types.Executor) error {
	return s.heartbeat(ctx, executor, timeutil.Now())
}

// TODO - test
func (s *executorStore) heartbeat(ctx context.Context, executor types.Executor, now time.Time) error {
	return s.Exec(ctx, sqlf.Sprintf(
		executorStoryHeartbeatQuery,
		executor.Hostname,
		executor.QueueName,
		executor.OS,
		executor.Architecture,
		executor.ExecutorVersion,
		executor.SrcCliVersion,
		executor.GitVersion,
		executor.DockerVersion,
		executor.IgniteVersion,
		now,
		now,
		now,
	))
}

const executorStoryHeartbeatQuery = `
-- source: internal/database/executors.go:HeartbeatHeartbeat
INSERT INTO executor_heartbeats (
	hostname,
	queue_name,
	os,
	architecture,
	executor_version,
	src_cli_version,
	git_version,
	docker_version,
	ignite_version,
	first_seen_at,
	last_seen_at
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (hostname) DO UPDATE SET last_seen_at = %s
`
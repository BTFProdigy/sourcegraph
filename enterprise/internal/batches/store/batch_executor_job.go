package store

import (
	"context"

	"github.com/keegancsmith/sqlf"
	"github.com/lib/pq"

	btypes "github.com/sourcegraph/sourcegraph/enterprise/internal/batches/types"
	"github.com/sourcegraph/sourcegraph/enterprise/internal/executor"
	"github.com/sourcegraph/sourcegraph/internal/database/dbutil"
)

func (s *Store) CreateBatchExecutorJob(ctx context.Context, job executor.Job) (*btypes.BatchExecutorJob, error) {
	bej := &btypes.BatchExecutorJob{
		CreatedAt: s.now(),
		UpdatedAt: s.now(),
		Job:       job,
	}

	q := createBatchExecutorJobQuery(bej)
	if err := s.query(ctx, q, func(sc scanner) error {
		return scanBatchExecutorJob(bej, sc)
	}); err != nil {
		return nil, err
	}
	return bej, nil
}

const createBatchExecutorJobQueryFmtstr = `
-- source: enterprise/internal/batches/store/batch_executor_job.go:CreateBatchExecutorJob
INSERT INTO batch_executor_jobs (
	created_at,
	updated_at,
	job
)
VALUES
	(%s, %s, %s)
RETURNING
	%s
`

func createBatchExecutorJobQuery(bej *btypes.BatchExecutorJob) *sqlf.Query {
	return sqlf.Sprintf(
		createPendingBatchSpecQueryFmtstr,
		bej.CreatedAt,
		bej.UpdatedAt,
		bej.Job,
		sqlf.Join(BatchExecutorJobColumns, ","),
	)
}

func scanBatchExecutorJob(bej *btypes.BatchExecutorJob, sc scanner) error {
	return sc.Scan(
		&bej.ID,
		&bej.State,
		&dbutil.NullString{S: &bej.FailureMessage},
		&dbutil.NullTime{Time: &bej.StartedAt},
		&dbutil.NullTime{Time: &bej.FinishedAt},
		&dbutil.NullTime{Time: &bej.ProcessAfter},
		&bej.NumResets,
		&bej.NumFailures,
		pq.Array(&bej.ExecutionLogs),
		&bej.CreatedAt,
		&bej.UpdatedAt,
		&bej.Job,
	)
}

var BatchExecutorJobColumns = []*sqlf.Query{
	sqlf.Sprintf("id"),
	sqlf.Sprintf("state"),
	sqlf.Sprintf("failure_message"),
	sqlf.Sprintf("started_at"),
	sqlf.Sprintf("finished_at"),
	sqlf.Sprintf("process_after"),
	sqlf.Sprintf("num_resets"),
	sqlf.Sprintf("num_failures"),
	sqlf.Sprintf("execution_logs"),
	sqlf.Sprintf("created_at"),
	sqlf.Sprintf("updated_at"),
	sqlf.Sprintf("job"),
}
package runner

import (
	"context"
	"fmt"

	"github.com/cockroachdb/errors"
	"github.com/inconshreveable/log15"

	"github.com/sourcegraph/sourcegraph/internal/database/migration/schemas"
)

type Runner struct {
	storeFactories map[string]StoreFactory
}

type StoreFactory func(ctx context.Context) (Store, error)

func NewRunner(storeFactories map[string]StoreFactory) *Runner {
	return &Runner{
		storeFactories: storeFactories,
	}
}

type Options struct {
	Up            bool
	NumMigrations int
	SchemaNames   []string
}

func (r *Runner) Run(ctx context.Context, options Options) error {
	schemaContexts, err := r.prepareContexts(ctx, options.SchemaNames)
	if err != nil {
		return err
	}

	// Run the migrations
	return r.runSchemas(ctx, options, schemaContexts)
}

func (r *Runner) prepareContexts(ctx context.Context, schemaNames []string) (map[string]schemaContext, error) {
	// Create map of relevant schemas keyed by name
	schemaMap, err := r.prepareSchemas(schemaNames)
	if err != nil {
		return nil, err
	}

	// Create map of migration stores keyed by name
	storeMap, err := r.prepareStores(ctx, schemaNames)
	if err != nil {
		return nil, err
	}

	// Create map of versions keyed by name
	versionMap, err := r.fetchVersions(ctx, storeMap)
	if err != nil {
		return nil, err
	}

	// Invert maps so we can get the set of data necessary to run each schema
	schemaContexts := make(map[string]schemaContext, len(schemaNames))
	for _, schemaName := range schemaNames {
		schemaContexts[schemaName] = schemaContext{
			schema:  schemaMap[schemaName],
			store:   storeMap[schemaName],
			version: versionMap[schemaName],
		}
	}

	return schemaContexts, nil
}

func (r *Runner) prepareSchemas(schemaNames []string) (map[string]*schemas.Schema, error) {
	schemaMap := make(map[string]*schemas.Schema, len(schemaNames))

	for _, targetSchemaName := range schemaNames {
		for _, schema := range schemas.Schemas {
			if schema.Name == targetSchemaName {
				schemaMap[schema.Name] = schema
				break
			}
		}
	}

	// Ensure that all supplied schema names are valid
	for _, schemaName := range schemaNames {
		if _, ok := schemaMap[schemaName]; !ok {
			return nil, fmt.Errorf("unknown schema %q", schemaName)
		}
	}

	return schemaMap, nil
}

func (r *Runner) prepareStores(ctx context.Context, schemaNames []string) (map[string]Store, error) {
	storeMap := make(map[string]Store, len(schemaNames))

	for _, schemaName := range schemaNames {
		storeFactory, ok := r.storeFactories[schemaName]
		if !ok {
			return nil, fmt.Errorf("unknown schema %q", schemaName)
		}

		store, err := storeFactory(ctx)
		if err != nil {
			return nil, err
		}

		storeMap[schemaName] = store
	}

	return storeMap, nil
}

func (r *Runner) fetchVersions(ctx context.Context, storeMap map[string]Store) (map[string]int, error) {
	versions := make(map[string]int, len(storeMap))

	for schemaName, store := range storeMap {
		version, dirty, _, err := store.Version(ctx)
		if err != nil {
			return nil, err
		}

		log15.Info("Checked current version", "schema", schemaName, "version", version, "dirty", dirty)

		if dirty {
			return nil, fmt.Errorf("dirty database")
		}

		versions[schemaName] = version
	}

	return versions, nil
}

type schemaContext struct {
	schema  *schemas.Schema
	store   Store
	version int
}

func (r *Runner) runSchemas(ctx context.Context, options Options, schemaContexts map[string]schemaContext) error {
	for _, context := range schemaContexts {
		if err := r.runSchema(ctx, options, context); err != nil {
			return err
		}
	}

	return nil
}

func (r *Runner) runSchema(ctx context.Context, options Options, context schemaContext) error {
	if locked, unlock, err := context.store.Lock(ctx); err != nil {
		return err
	} else if !locked {
		return fmt.Errorf("failed to acquire lock")
	} else {
		defer func() { err = unlock(err) }()
	}

	if options.Up {
		if err := r.runSchemaUp(ctx, options, context); err != nil {
			return err
		}
	} else {
		if err := r.runSchemaDown(ctx, options, context); err != nil {
			return err
		}
	}

	return nil
}

func (r *Runner) runSchemaUp(ctx context.Context, options Options, context schemaContext) (err error) {
	log15.Info("Upgrading schema", "schema", context.schema.Name)

	definitions, err := context.schema.Definitions.UpFrom(context.version, options.NumMigrations)
	if err != nil {
		return err
	}

	for _, definition := range definitions {
		log15.Info("Running up migration", "schema", context.schema.Name, "migrationID", definition.ID)

		if err := context.store.Up(ctx, definition); err != nil {
			return errors.Wrapf(err, "failed upgrade migration %d", definition.ID)
		}
	}

	return nil
}

func (r *Runner) runSchemaDown(ctx context.Context, options Options, context schemaContext) error {
	log15.Info("Downgrading schema", "schema", context.schema.Name)

	definitions, err := context.schema.Definitions.DownFrom(context.version, options.NumMigrations)
	if err != nil {
		return err
	}

	for _, definition := range definitions {
		log15.Info("Running down migration", "schema", context.schema.Name, "migrationID", definition.ID)

		if err := context.store.Down(ctx, definition); err != nil {
			return errors.Wrapf(err, "failed downgrade migration %d", definition.ID)
		}
	}

	return nil
}

func (r *Runner) Validate(ctx context.Context, schemaNames ...string) error {
	schemaContexts, err := r.prepareContexts(ctx, schemaNames)
	if err != nil {
		return err
	}

	// Validate database schemas are up to date
	return r.validateSchemas(ctx, schemaContexts)
}

func (r *Runner) validateSchemas(ctx context.Context, schemaContexts map[string]schemaContext) error {
	for schemaName, schemaContext := range schemaContexts {
		definitions, err := schemaContext.schema.Definitions.UpFrom(schemaContext.version, 0)
		if err != nil {
			// An error here means we might just be a very old instance.
			// In order to figure out what version we expect to be at, we
			// re-query from a "blank" database so that we can take populate
			// the definitions variable in the error construction below.
			//
			// Note that we can't exit without an error value from this function
			// from this branch.

			var innerErr error
			definitions, innerErr = schemaContext.schema.Definitions.UpFrom(0, 0)
			if innerErr != nil || len(definitions) == 0 {
				return err
			}
		}
		if len(definitions) == 0 {
			continue
		}

		return &SchemaOutOfDateError{
			schemaName:      schemaName,
			currentVersion:  schemaContext.version,
			expectedVersion: definitions[len(definitions)-1].ID,
		}
	}

	return nil
}

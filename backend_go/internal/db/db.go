package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

// DB is the global PostgreSQL connection pool used across the Go backend.
var DB *sql.DB

// Connect opens a connection pool to PostgreSQL using pgx driver.
func Connect(dsn string) (*sql.DB, error) {
	config, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database configuration: %w", err)
	}
	config.RuntimeParams["timezone"] = "UTC"
	config.RuntimeParams["statement_timeout"] = "10000"
	db := stdlib.OpenDB(*config)

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	DB = db
	log.Printf("Connected to PostgreSQL")
	return db, nil
}

// Close shuts down the connection pool.
func Close() {
	if DB != nil {
		if err := DB.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}
}

// ExecSchema runs the schema SQL file against the database.
func ExecSchema(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read schema file: %w", err)
	}

	// Execute the entire schema file as a single statement batch.
	// PostgreSQL supports multiple statements separated by semicolons.
	if _, err := DB.Exec(string(data)); err != nil {
		return fmt.Errorf("execute schema: %w", err)
	}
	return nil
}

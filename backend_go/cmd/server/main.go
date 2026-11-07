package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"routewise/internal/db"
	"routewise/internal/handlers"
	"routewise/internal/seed"
)

func main() {
	if len(os.Getenv("SECRET_KEY")) < 32 {
		log.Fatal("Set SECRET_KEY to a random value of at least 32 characters")
	}
	dsn := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/routewise?sslmode=disable")
	port := getEnv("PORT", "8000")

	// Connect to PostgreSQL.
	pg, err := db.Connect(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run schema (idempotent — uses CREATE TABLE IF NOT EXISTS).
	schemaPath := schemaFilePath()
	log.Printf("Applying schema from %s", schemaPath)
	if err := db.ExecSchema(schemaPath); err != nil {
		log.Fatalf("Failed to apply schema: %v", err)
	}

	// Seed initial data (idempotent — skips existing rows).
	if os.Getenv("SEED_DEMO") == "true" {
		if err := seed.Run(pg); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}

	}

	// Build HTTP router.
	mux := handlers.NewRouter(pg)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Run server in a goroutine so we can listen for shutdown signals.
	go func() {
		log.Printf("RouteWise Go backend listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for SIGINT/SIGTERM.
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Forced shutdown: %v", err)
	}
	log.Println("Server stopped.")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// schemaFilePath resolves the path to internal/db/schema.sql relative to the
// working directory or the executable binary.
func schemaFilePath() string {
	if path := strings.TrimSpace(os.Getenv("SCHEMA_PATH")); path != "" {
		return path
	}
	candidates := []string{
		"internal/db/schema.sql",
		"../internal/db/schema.sql",
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			return c
		}
	}
	// Fallback relative to the executable.
	if exe, err := os.Executable(); err == nil {
		return exe + "/../internal/db/schema.sql"
	}
	return "internal/db/schema.sql"
}

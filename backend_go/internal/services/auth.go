package services

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"routewise/internal/auth"
	"routewise/internal/models"
)

// AuthService handles user registration, login, and token issuance.
type AuthService struct {
	db *sql.DB
}

func NewAuthService(db *sql.DB) *AuthService {
	return &AuthService{db: db}
}

// Register creates a new user. The first user is promoted to admin; any
// subsequent user is a customer. Returns the user row.
func (s *AuthService) Register(name, email, password, role string) (models.User, error) {
	var existing int
	if err := s.db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&existing); err != nil && err != sql.ErrNoRows {
		return models.User{}, err
	} else if err == nil {
		return models.User{}, errors.New("email already registered")
	}

	resolvedRole, err := storedChoice(s.db, "users", "role", "customer")
	if err != nil {
		return models.User{}, err
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return models.User{}, err
	}

	var id int
	var createdAt time.Time
	var roleOut string
	err = s.db.QueryRow(
		`INSERT INTO users (name, email, password_hash, role, created_at)
		 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id, role, created_at`,
		name, email, hash, resolvedRole,
	).Scan(&id, &roleOut, &createdAt)
	if err != nil {
		return models.User{}, err
	}

	return models.User{
		ID:           id,
		Name:         name,
		Email:        email,
		PasswordHash: hash,
		Role:         strings.ToLower(roleOut),
		CreatedAt:    createdAt,
	}, nil
}

// Authenticate verifies email/password and returns the user on success.
func (s *AuthService) Authenticate(email, password string) (models.User, error) {
	var user models.User
	var hash string
	err := s.db.QueryRow(
		`SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&user.ID, &user.Name, &user.Email, &hash, &user.Role, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return models.User{}, errors.New("invalid email or password")
	}
	if err != nil {
		return models.User{}, err
	}
	if !auth.CheckPassword(password, hash) {
		return models.User{}, errors.New("invalid email or password")
	}
	user.Role = strings.ToLower(strings.TrimSpace(user.Role))
	user.PasswordHash = hash
	return user, nil
}

// GetByID returns a user by ID.
func (s *AuthService) GetByID(id int) (models.User, error) {
	var user models.User
	var hash string
	err := s.db.QueryRow(
		`SELECT id, name, email, password_hash, role, created_at FROM users WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Name, &user.Email, &hash, &user.Role, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return models.User{}, sql.ErrNoRows
	}
	if err != nil {
		return models.User{}, err
	}
	user.Role = strings.ToLower(strings.TrimSpace(user.Role))
	user.PasswordHash = hash
	return user, nil
}

// CreateToken issues a JWT for the given user.
func (s *AuthService) CreateToken(user models.User) (string, error) {
	return auth.CreateToken(user.Email, user.Role, user.ID)
}

package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"routewise/internal/auth"
)

type contextKey string

const UserKey contextKey = "user"

type UserContext struct {
	ID    int
	Email string
	Role  string
}

func JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeJSONError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			writeJSONError(w, http.StatusUnauthorized, "Invalid authorization header format")
			return
		}

		claims, err := auth.VerifyToken(parts[1])
		if err != nil {
			writeJSONError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		user := &UserContext{
			ID:    claims.UserID,
			Email: claims.Email,
			Role:  strings.ToLower(strings.TrimSpace(claims.Role)),
		}

		ctx := context.WithValue(r.Context(), UserKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := r.Context().Value(UserKey).(*UserContext)
			if !ok {
				writeJSONError(w, http.StatusUnauthorized, "User not in context")
				return
			}

			for _, role := range roles {
				if user.Role == role {
					next.ServeHTTP(w, r)
					return
				}
			}

			writeJSONError(w, http.StatusForbidden, "Insufficient permissions")
		})
	}
}

func RequireAdmin(next http.Handler) http.Handler {
	return RequireRole("admin")(next)
}

func AdminOnly(next http.Handler) http.Handler {
	return RequireRole("admin")(next)
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{"detail": message})
}

func IsAdmin(r *http.Request) bool {
	user, ok := r.Context().Value(UserKey).(*UserContext)
	if !ok {
		return false
	}
	return user.Role == "admin"
}

func CurrentUser(r *http.Request) *UserContext {
	user, _ := r.Context().Value(UserKey).(*UserContext)
	return user
}

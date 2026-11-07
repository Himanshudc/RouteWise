package auth

import (
	"github.com/golang-jwt/jwt/v5"
	"testing"
	"time"
)

func TestTokenAndPasswords(t *testing.T) {
	t.Setenv("SECRET_KEY", "test-secret-longer-than-thirty-two-characters")
	hash, err := HashPassword("correct-password")
	if err != nil || !CheckPassword("correct-password", hash) || CheckPassword("wrong", hash) {
		t.Fatal("password hashing")
	}
	token, err := CreateToken("user@example.com", "customer", 12)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := VerifyToken(token)
	if err != nil || claims.UserID != 12 || claims.Role != "customer" {
		t.Fatal("claims", err)
	}
	for _, method := range []jwt.SigningMethod{jwt.SigningMethodHS256, jwt.SigningMethodHS384} {
		expired := jwt.NewWithClaims(method, Claims{RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour))}})
		raw, _ := expired.SignedString([]byte("test-secret-longer-than-thirty-two-characters"))
		if _, err := VerifyToken(raw); err == nil {
			t.Fatal("invalid/expired token accepted")
		}
	}
	t.Setenv("SECRET_KEY", "short")
	if _, err := CreateToken("a", "admin", 1); err == nil {
		t.Fatal("short secret accepted")
	}
}

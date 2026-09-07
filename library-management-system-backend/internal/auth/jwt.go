package auth

import (
	"errors"
	"fmt"
	"time"

	"library-management-system-backend/internal/config"
	"library-management-system-backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type JWTService struct {
	config *config.Config
}

func NewJWTService(cfg *config.Config) *JWTService {
	return &JWTService{config: cfg}
}

// GenerateTokenPair generates both access and refresh tokens
func (j *JWTService) GenerateTokenPair(user *models.User) (*TokenPair, error) {
	// Generate access token
	accessToken, err := j.generateToken(user, j.config.JWT.Expiry, "access")
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token
	refreshToken, err := j.generateToken(user, j.config.JWT.RefreshExpiry, "refresh")
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// generateToken generates a JWT token
func (j *JWTService) generateToken(user *models.User, expiry time.Duration, tokenType string) (string, error) {
	now := time.Now()
	claims := JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "library-management-system-backend",
			Subject:   fmt.Sprintf("%d", user.ID),
			Audience:  []string{"library-users"},
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        fmt.Sprintf("%s-%d", tokenType, user.ID),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(j.config.JWT.Secret))
}

// ValidateToken validates a JWT token and returns the claims
func (j *JWTService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(j.config.JWT.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// RefreshToken refreshes an access token using a refresh token
func (j *JWTService) RefreshToken(refreshToken string) (*TokenPair, error) {
	// Validate refresh token
	claims, err := j.ValidateToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Check if it's actually a refresh token
	if claims.ID == "" || len(claims.ID) < 8 || claims.ID[:8] != "refresh-" {
		return nil, errors.New("token is not a refresh token")
	}

	// Create a mock user for token generation
	user := &models.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  claims.Role,
	}

	// Generate new token pair
	return j.GenerateTokenPair(user)
}

// ExtractUserFromToken extracts user information from a token
func (j *JWTService) ExtractUserFromToken(tokenString string) (*models.User, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return nil, fmt.Errorf("failed to validate token: %w", err)
	}

	return &models.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  claims.Role,
	}, nil
}

// IsTokenExpired checks if a token is expired
func (j *JWTService) IsTokenExpired(tokenString string) (bool, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return true, err
	}

	return time.Now().After(claims.ExpiresAt.Time), nil
}

// GetTokenExpirationTime returns the expiration time of a token
func (j *JWTService) GetTokenExpirationTime(tokenString string) (*time.Time, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	return &claims.ExpiresAt.Time, nil
}

// GeneratePasswordResetToken generates a password reset token
func (j *JWTService) GeneratePasswordResetToken(email string) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    "library-management-system-backend",
		Subject:   email,
		Audience:  []string{"password-reset"},
		ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)), // 15 minutes
		NotBefore: jwt.NewNumericDate(now),
		IssuedAt:  jwt.NewNumericDate(now),
		ID:        "password-reset",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(j.config.JWT.Secret))
}

// ValidatePasswordResetToken validates a password reset token
func (j *JWTService) ValidatePasswordResetToken(tokenString string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(j.config.JWT.Secret), nil
	})

	if err != nil {
		return "", fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
		if claims.ID != "password-reset" {
			return "", errors.New("invalid token type")
		}
		return claims.Subject, nil
	}

	return "", errors.New("invalid token")
}

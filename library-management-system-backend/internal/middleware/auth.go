package middleware

import (
	"net/http"
	"strings"

	"library-management-system-backend/internal/auth"
	"library-management-system-backend/internal/config"
	"library-management-system-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT tokens and sets user context
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Authorization header required",
				"message": "Please provide a valid JWT token",
			})
			c.Abort()
			return
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid authorization header format",
				"message": "Authorization header must start with 'Bearer '",
			})
			c.Abort()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate token
		jwtService := auth.NewJWTService(cfg)
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid token",
				"message": "Please provide a valid JWT token",
			})
			c.Abort()
			return
		}

		// Create user object from claims
		user := &models.User{
			ID:    claims.UserID,
			Email: claims.Email,
			Role:  claims.Role,
		}

		// Set user in context
		c.Set("user", user)
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("userRole", claims.Role)

		c.Next()
	}
}

// AdminMiddleware ensures the user has admin role
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "User not found in context",
				"message": "Authentication required",
			})
			c.Abort()
			return
		}

		userObj, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Invalid user object",
				"message": "Internal server error",
			})
			c.Abort()
			return
		}

		if !userObj.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Insufficient permissions",
				"message": "Admin role required for this operation",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// LibrarianMiddleware ensures the user has librarian or admin role
func LibrarianMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "User not found in context",
				"message": "Authentication required",
			})
			c.Abort()
			return
		}

		userObj, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Invalid user object",
				"message": "Internal server error",
			})
			c.Abort()
			return
		}

		if !userObj.IsAdminOrLibrarian() {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Insufficient permissions",
				"message": "Librarian or admin role required for this operation",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuthMiddleware validates JWT tokens if provided, but doesn't require them
func OptionalAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			// Invalid format, continue without authentication
			c.Next()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate token
		jwtService := auth.NewJWTService(cfg)
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			// Invalid token, continue without authentication
			c.Next()
			return
		}

		// Create user object from claims
		user := &models.User{
			ID:    claims.UserID,
			Email: claims.Email,
			Role:  claims.Role,
		}

		// Set user in context
		c.Set("user", user)
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("userRole", claims.Role)

		c.Next()
	}
}

// GetCurrentUser extracts the current user from context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}

	userObj, ok := user.(*models.User)
	if !ok {
		return nil, false
	}

	return userObj, true
}

// GetCurrentUserID extracts the current user ID from context
func GetCurrentUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, false
	}

	id, ok := userID.(uint)
	if !ok {
		return 0, false
	}

	return id, true
}

// GetCurrentUserRole extracts the current user role from context
func GetCurrentUserRole(c *gin.Context) (string, bool) {
	role, exists := c.Get("userRole")
	if !exists {
		return "", false
	}

	roleStr, ok := role.(string)
	if !ok {
		return "", false
	}

	return roleStr, true
}

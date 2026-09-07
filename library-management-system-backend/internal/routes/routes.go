package routes

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"library-management-system-backend/internal/auth"
	"library-management-system-backend/internal/config"
	"library-management-system-backend/internal/database"
	"library-management-system-backend/internal/middleware"
	"library-management-system-backend/internal/models"
	"library-management-system-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// SetupAuthRoutes sets up authentication routes
func SetupAuthRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	auth := rg.Group("/auth")
	{
		auth.POST("/register", registerHandler(cfg, db))
		auth.POST("/login", loginHandler(cfg, db))
		auth.POST("/refresh", refreshTokenHandler(cfg, db))
		auth.POST("/logout", logoutHandler())
		auth.POST("/forgot-password", forgotPasswordHandler(cfg, db))
		auth.POST("/reset-password", resetPasswordHandler(cfg, db))
		auth.GET("/verify-email/:token", verifyEmailHandler(cfg, db))
	}
}

// SetupProtectedAuthRoutes sets up protected authentication routes
func SetupProtectedAuthRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	auth := rg.Group("/auth")
	{
		auth.GET("/me", getCurrentUserHandler(db))
	}
}

// SetupUserRoutes sets up user management routes
func SetupUserRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	users := rg.Group("/users")
	{
		users.GET("/profile", getProfileHandler(db))
		users.PUT("/profile", updateProfileHandler(db))
		users.GET("/borrows", getUserBorrowsHandler(db))
		users.GET("/reservations", getUserReservationsHandler(db))
		users.GET("/fines", getUserFinesHandler(db))
		users.GET("/dashboard", getUserDashboardHandler(db))
	}
}

// SetupBookRoutes sets up book management routes
func SetupBookRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	books := rg.Group("/books")
	{
		books.GET("", getBooksHandler(db))
		books.GET("/:id", getBookHandler(db))
		books.GET("/search", searchBooksHandler(db))
		books.GET("/categories", getBookCategoriesHandler(db))
	}
}

// SetupBorrowRoutes sets up borrowing routes
func SetupBorrowRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	borrows := rg.Group("/borrows")
	{
		borrows.POST("", createBorrowHandler(db))
		borrows.GET("", getBorrowsHandler(db))
		borrows.GET("/:id", getBorrowHandler(db))
		borrows.PUT("/:id/return", returnBorrowHandler(db))
		borrows.GET("/overdue", getOverdueBorrowsHandler(db))
	}
}

// SetupReservationRoutes sets up reservation routes
func SetupReservationRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	reservations := rg.Group("/reservations")
	{
		reservations.POST("", createReservationHandler(db))
		reservations.GET("", getReservationsHandler(db))
		reservations.GET("/:id", getReservationHandler(db))
		reservations.DELETE("/:id", cancelReservationHandler(db))
	}
}

// SetupFineRoutes sets up fine management routes
func SetupFineRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	fines := rg.Group("/fines")
	{
		fines.GET("", getFinesHandler(db))
		fines.GET("/:id", getFineHandler(db))
		fines.PUT("/:id/pay", payFineHandler(db))
		fines.GET("/summary", getFineSummaryHandler(db))
	}
}

// SetupNotificationRoutes sets up notification management routes
func SetupNotificationRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	notifications := rg.Group("/notifications")
	{
		notifications.GET("", getNotificationsHandler(db))
		notifications.GET("/unread-count", getUnreadNotificationCountHandler(db))
		notifications.PUT("/:id/read", markNotificationAsReadHandler(db))
		notifications.PUT("/mark-all-read", markAllNotificationsAsReadHandler(db))
		notifications.DELETE("/:id", deleteNotificationHandler(db))
		notifications.POST("", createNotificationHandler(db))

		// Smart notification generators
		notifications.POST("/generate/book-return-reminder", generateBookReturnReminderHandler(db))
		notifications.POST("/generate/overdue-notification", generateOverdueNotificationHandler(db))
		notifications.POST("/generate/reservation-available", generateReservationAvailableHandler(db))
		notifications.POST("/generate/fine-notification", generateFineNotificationHandler(db))
		notifications.POST("/generate/new-book-notification", generateNewBookNotificationHandler(db))
	}
}

// SetupAdminRoutes sets up admin-only routes
func SetupAdminRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	admin := rg.Group("")
	{
		// User management
		admin.GET("/users", getUsersHandler(db))
		admin.GET("/users/:id", getUserHandler(db))
		admin.PUT("/users/:id", updateUserHandler(db))
		admin.DELETE("/users/:id", deleteUserHandler(db))
		admin.PUT("/users/:id/activate", activateUserHandler(db))
		admin.PUT("/users/:id/deactivate", deactivateUserHandler(db))

		// Book management
		admin.GET("/books", getAdminBooksHandler(db))
		admin.POST("/books", createBookHandler(db))
		admin.PUT("/books/:id", updateBookHandler(db))
		admin.DELETE("/books/:id", deleteBookHandler(db))
		admin.PUT("/books/:id/copies", updateBookCopiesHandler(db))

		// Borrow management
		admin.GET("/borrows", getAllBorrowsHandler(db))
		admin.PUT("/borrows/:id/extend", extendBorrowHandler(db))
		admin.PUT("/borrows/:id/force-return", forceReturnBorrowHandler(db))

		// Reservation management
		admin.GET("/reservations", getAllReservationsHandler(db))
		admin.PUT("/reservations/:id/fulfill", fulfillReservationHandler(db))

		// Fine management
		admin.GET("/fines", getAllFinesHandler(db))
		admin.POST("/fines", createFineHandler(db))
		admin.PUT("/fines/:id", updateFineHandler(db))
		admin.DELETE("/fines/:id", deleteFineHandler(db))

		// Reports and analytics
		admin.GET("/reports/overview", getOverviewReportHandler(db))
		admin.GET("/reports/books", getBookReportHandler(db))
		admin.GET("/reports/users", getUserReportHandler(db))
		admin.GET("/reports/fines", getFineReportHandler(db))
		admin.GET("/analytics/dashboard", getAdminDashboardHandler(db))
	}
}

// SetupWebSocketRoutes sets up WebSocket routes
func SetupWebSocketRoutes(rg *gin.RouterGroup, cfg *config.Config, db *database.Database) {
	ws := rg.Group("")
	{
		ws.GET("/notifications", notificationHandler(cfg, db))
		ws.GET("/chat", chatHandler(cfg, db))
	}
}

// Authentication handlers
func registerHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UserCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		// Check if user already exists
		userRepo := repository.NewUserRepository(db.DB)
		exists, err := userRepo.CheckEmailExists(c.Request.Context(), req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check email existence"})
			return
		}
		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
			return
		}

		// Hash password
		hashedPassword, err := auth.HashPassword(req.Password)
		if err != nil {
			// Check if it's a password strength error
			if strength := auth.ValidatePasswordStrength(req.Password); !strength.IsValid {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":        "Password does not meet requirements",
					"requirements": auth.GeneratePasswordStrengthMessage(strength),
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		// Create user
		user := &models.User{
			Email:        req.Email,
			PasswordHash: hashedPassword,
			FirstName:    req.FirstName,
			LastName:     req.LastName,
			Phone:        req.Phone,
			Role:         "user",
			IsActive:     true,
		}

		if err := userRepo.Create(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		// Generate tokens
		jwtService := auth.NewJWTService(cfg)
		tokens, err := jwtService.GenerateTokenPair(user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "User registered successfully",
			"user":    user.ToResponse(),
			"tokens":  tokens,
		})
	}
}

func loginHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UserLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		// Get user by email
		userRepo := repository.NewUserRepository(db.DB)
		user, err := userRepo.GetByEmail(c.Request.Context(), req.Email)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// Check if user is active
		if !user.IsActive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account is deactivated"})
			return
		}

		// Verify password
		if !auth.CheckPassword(req.Password, user.PasswordHash) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// Generate tokens
		jwtService := auth.NewJWTService(cfg)
		tokens, err := jwtService.GenerateTokenPair(user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
			"user":    user.ToResponse(),
			"tokens":  tokens,
		})
	}
}

func refreshTokenHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refreshToken" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token required"})
			return
		}

		jwtService := auth.NewJWTService(cfg)
		tokens, err := jwtService.RefreshToken(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Token refreshed successfully",
			"tokens":  tokens,
		})
	}
}

func logoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// In a real application, you might want to blacklist the token
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}

func forgotPasswordHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email string `json:"email" binding:"required,email"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Valid email required"})
			return
		}

		// Check if user exists
		userRepo := repository.NewUserRepository(db.DB)
		user, err := userRepo.GetByEmail(c.Request.Context(), req.Email)
		if err != nil {
			// Don't reveal if user exists or not
			c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a password reset link has been sent"})
			return
		}

		// Generate password reset token
		jwtService := auth.NewJWTService(cfg)
		_, err = jwtService.GeneratePasswordResetToken(user.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
			return
		}

		// In a real application, send email with reset link
		// For now, just return success
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a password reset link has been sent"})
	}
}

func resetPasswordHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Token    string `json:"token" binding:"required"`
			Password string `json:"password" binding:"required,min=8"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Token and new password required"})
			return
		}

		// Validate token and get email
		jwtService := auth.NewJWTService(cfg)
		email, err := jwtService.ValidatePasswordResetToken(req.Token)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired token"})
			return
		}

		// Get user by email
		userRepo := repository.NewUserRepository(db.DB)
		user, err := userRepo.GetByEmail(c.Request.Context(), email)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
			return
		}

		// Hash new password
		hashedPassword, err := auth.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		// Update password
		user.PasswordHash = hashedPassword
		if err := userRepo.Update(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
	}
}

func verifyEmailHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")
		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Token required"})
			return
		}

		// Validate token and get email
		jwtService := auth.NewJWTService(cfg)
		email, err := jwtService.ValidatePasswordResetToken(token)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired token"})
			return
		}

		// Get user by email
		userRepo := repository.NewUserRepository(db.DB)
		user, err := userRepo.GetByEmail(c.Request.Context(), email)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
			return
		}

		// Mark email as verified
		user.EmailVerified = true
		if err := userRepo.Update(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify email"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully"})
	}
}

// User handlers
func getCurrentUserHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := middleware.GetCurrentUser(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		c.JSON(http.StatusOK, user.ToResponse())
	}
}

func getProfileHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		userRepo := repository.NewUserRepository(db.DB)
		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"user": user.ToResponse()})
	}
}

func updateProfileHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		var req models.UserUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		userRepo := repository.NewUserRepository(db.DB)
		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		// Update fields
		if req.FirstName != "" {
			user.FirstName = req.FirstName
		}
		if req.LastName != "" {
			user.LastName = req.LastName
		}
		if req.Phone != "" {
			user.Phone = req.Phone
		}

		if err := userRepo.Update(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully", "user": user.ToResponse()})
	}
}

func getUserBorrowsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		// Get user's borrows
		userRepo := repository.NewUserRepository(db.DB)
		borrows, err := userRepo.GetActiveBorrows(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrows"})
			return
		}

		// Convert to response format
		var borrowResponses []models.BorrowResponse
		for _, borrow := range borrows {
			borrowResponses = append(borrowResponses, borrow.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{"borrows": borrowResponses})
	}
}

func getUserReservationsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		// Get user's reservations
		userRepo := repository.NewUserRepository(db.DB)
		user, err := userRepo.GetWithReservations(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservations"})
			return
		}

		var reservationResponses []models.ReservationResponse
		for _, reservation := range user.Reservations {
			reservationResponses = append(reservationResponses, reservation.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{"reservations": reservationResponses})
	}
}

func getUserFinesHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		// Get user's fines
		userRepo := repository.NewUserRepository(db.DB)
		fines, err := userRepo.GetUnpaidFines(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fines"})
			return
		}

		var fineResponses []models.FineResponse
		for _, fine := range fines {
			fineResponses = append(fineResponses, fine.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{"fines": fineResponses})
	}
}

func getUserDashboardHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		userRepo := repository.NewUserRepository(db.DB)
		stats, err := userRepo.GetUserStats(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user stats"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"dashboard": stats})
	}
}

// Book handlers
func getBooksHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Parse query parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		search := c.Query("search")
		category := c.Query("category")

		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 10
		}

		// Get books with filtering
		books, total, err := bookRepo.List(c.Request.Context(), page, limit, search, category, "")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get books"})
			return
		}

		// Convert to response format
		var bookResponses []models.BookResponse
		for _, book := range books {
			bookResponses = append(bookResponses, book.ToResponse())
		}

		totalPages := int(math.Ceil(float64(total) / float64(limit)))

		c.JSON(http.StatusOK, gin.H{
			"books": bookResponses,
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": totalPages,
		})
	}
}

func getBookHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
			return
		}

		// Get book by ID
		book, err := bookRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get book"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"book": book.ToResponse()})
	}
}

func searchBooksHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		search := c.Query("q")
		if search == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Search query required"})
			return
		}

		// Parse optional parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
		category := c.Query("category")

		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 20
		}

		// Search books
		books, total, err := bookRepo.List(c.Request.Context(), page, limit, search, category, "")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search books"})
			return
		}

		// Convert to response format
		var bookResponses []models.BookResponse
		for _, book := range books {
			bookResponses = append(bookResponses, book.ToResponse())
		}

		totalPages := int(math.Ceil(float64(total) / float64(limit)))

		c.JSON(http.StatusOK, gin.H{
			"books": bookResponses,
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": totalPages,
		})
	}
}

func getBookCategoriesHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Get distinct categories from existing books
		categories, err := bookRepo.GetCategories(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get categories"})
			return
		}

		// If no categories exist, provide defaults
		if len(categories) == 0 {
			categories = []string{"Fiction", "Non-Fiction", "Science", "History", "Technology", "Biography", "Mystery", "Romance", "Thriller", "Educational"}
		}

		c.JSON(http.StatusOK, gin.H{"categories": categories})
	}
}

// Borrow handlers
func createBorrowHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		var req models.BorrowCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		borrowRepo := repository.NewBorrowRepository(db.DB)
		bookRepo := repository.NewBookRepository(db.DB)

		// Check if book exists and is available
		book, err := bookRepo.GetByID(c.Request.Context(), req.BookID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
			return
		}

		if book.AvailableCopies <= 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Book is not available for borrowing"})
			return
		}

		// Check if user already has this book borrowed
		userBorrows, err := borrowRepo.GetActiveByUserID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check user borrows"})
			return
		}

		for _, borrow := range userBorrows {
			if borrow.BookID == req.BookID {
				c.JSON(http.StatusConflict, gin.H{"error": "You already have this book borrowed"})
				return
			}
		}

		// Create borrow with due date (2 weeks from now)
		dueDate := time.Now().AddDate(0, 0, 14)
		borrow := &models.Borrow{
			UserID:  userID,
			BookID:  req.BookID,
			DueDate: dueDate,
		}

		if err := borrowRepo.Create(c.Request.Context(), borrow); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create borrow"})
			return
		}

		// Decrease available copies
		if err := bookRepo.DecrementAvailableCopies(c.Request.Context(), req.BookID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book availability"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "Book borrowed successfully",
			"borrow":  borrow.ToResponse(),
		})
	}
}

func getBorrowsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		borrowRepo := repository.NewBorrowRepository(db.DB)

		// Parse query parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		status := c.Query("status")

		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 10
		}

		// Get user's borrows with pagination
		borrows, total, err := borrowRepo.List(c.Request.Context(), page, limit, "", status, &userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrows"})
			return
		}

		// Convert to response format
		var borrowResponses []models.BorrowResponse
		for _, borrow := range borrows {
			borrowResponses = append(borrowResponses, borrow.ToResponse())
		}

		totalPages := int(math.Ceil(float64(total) / float64(limit)))

		c.JSON(http.StatusOK, gin.H{
			"borrows": borrowResponses,
			"total":   total,
			"page":    page,
			"limit":   limit,
			"pages":   totalPages,
		})
	}
}

func getBorrowHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		borrowRepo := repository.NewBorrowRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid borrow ID"})
			return
		}

		// Get borrow by ID
		borrow, err := borrowRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Borrow not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrow"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"borrow": borrow.ToResponse()})
	}
}

func returnBorrowHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		borrowRepo := repository.NewBorrowRepository(db.DB)
		bookRepo := repository.NewBookRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid borrow ID"})
			return
		}

		// Get borrow to check if it exists and is not already returned
		borrow, err := borrowRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Borrow not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrow"})
			return
		}

		if borrow.ReturnedAt != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Book is already returned"})
			return
		}

		// Return the book
		if err := borrowRepo.ReturnBook(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to return book"})
			return
		}

		// Increment available copies
		if err := bookRepo.IncrementAvailableCopies(c.Request.Context(), borrow.BookID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book availability"})
			return
		}

		if db.Cache != nil {
			db.Cache.Delete(adminDashboardCacheKey)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Book returned successfully"})
	}
}

func getOverdueBorrowsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		borrowRepo := repository.NewBorrowRepository(db.DB)

		// Get overdue borrows for the user
		borrows, err := borrowRepo.GetOverdueByUserID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get overdue borrows"})
			return
		}

		// Convert to response format
		var borrowResponses []models.BorrowResponse
		for _, borrow := range borrows {
			borrowResponses = append(borrowResponses, borrow.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{"borrows": borrowResponses})
	}
}

// Reservation handlers
func createReservationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		var req models.ReservationCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		reservationRepo := repository.NewReservationRepository(db.DB)
		bookRepo := repository.NewBookRepository(db.DB)

		// Check if book exists
		_, err := bookRepo.GetByID(c.Request.Context(), req.BookID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
			return
		}

		// Check if user already has an active reservation for this book
		hasReservation, err := reservationRepo.CheckUserHasReservation(c.Request.Context(), userID, req.BookID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing reservation"})
			return
		}

		if hasReservation {
			c.JSON(http.StatusConflict, gin.H{"error": "You already have an active reservation for this book"})
			return
		}

		// Create reservation with expiration date (7 days from now)
		expiresAt := time.Now().AddDate(0, 0, 7)
		reservation := &models.Reservation{
			UserID:          userID,
			BookID:          req.BookID,
			ReservationDate: time.Now(),
			ExpiresAt:       expiresAt,
			Status:          "active",
		}

		if err := reservationRepo.Create(c.Request.Context(), reservation); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reservation"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":     "Reservation created successfully",
			"reservation": reservation.ToResponse(),
		})
	}
}

func getReservationsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		reservationRepo := repository.NewReservationRepository(db.DB)

		// Parse query parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		status := c.Query("status")

		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 10
		}

		// Get user's reservations with pagination
		reservations, total, err := reservationRepo.List(c.Request.Context(), page, limit, "", status, &userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservations"})
			return
		}

		// Convert to response format
		var reservationResponses []models.ReservationResponse
		for _, reservation := range reservations {
			reservationResponses = append(reservationResponses, reservation.ToResponse())
		}

		totalPages := int(math.Ceil(float64(total) / float64(limit)))

		c.JSON(http.StatusOK, gin.H{
			"reservations": reservationResponses,
			"total":        total,
			"page":         page,
			"limit":        limit,
			"pages":        totalPages,
		})
	}
}

func getReservationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		reservationRepo := repository.NewReservationRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
			return
		}

		// Get reservation by ID
		reservation, err := reservationRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservation"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"reservation": reservation.ToResponse()})
	}
}

func cancelReservationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		reservationRepo := repository.NewReservationRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
			return
		}

		// Get reservation to verify ownership and status
		reservation, err := reservationRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservation"})
			return
		}

		// Check if user owns this reservation
		if reservation.UserID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only cancel your own reservations"})
			return
		}

		// Check if reservation is already cancelled or fulfilled
		if reservation.Status != "active" {
			c.JSON(http.StatusConflict, gin.H{"error": "Reservation is already cancelled or fulfilled"})
			return
		}

		// Cancel the reservation
		if err := reservationRepo.CancelReservation(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel reservation"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Reservation cancelled successfully"})
	}
}

// Fine handlers
func getFinesHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		fineRepo := repository.NewFineRepository(db.DB)

		// Parse query parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		status := c.Query("status")

		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 10
		}

		// Get user's fines with pagination
		var isPaidFilter *bool
		if status == "paid" {
			val := true
			isPaidFilter = &val
		} else if status == "unpaid" {
			val := false
			isPaidFilter = &val
		}
		fines, total, err := fineRepo.List(c.Request.Context(), page, limit, "", isPaidFilter, &userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fines"})
			return
		}

		// Convert to response format
		var fineResponses []models.FineResponse
		for _, fine := range fines {
			fineResponses = append(fineResponses, fine.ToResponse())
		}

		totalPages := int(math.Ceil(float64(total) / float64(limit)))

		c.JSON(http.StatusOK, gin.H{
			"fines": fineResponses,
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": totalPages,
		})
	}
}

func getFineHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		fineRepo := repository.NewFineRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fine ID"})
			return
		}

		// Get fine by ID
		fine, err := fineRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Fine not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fine"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"fine": fine.ToResponse()})
	}
}

func payFineHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		fineRepo := repository.NewFineRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fine ID"})
			return
		}

		// Get fine to verify ownership and status
		fine, err := fineRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Fine not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fine"})
			return
		}

		// Check if user owns this fine
		if fine.UserID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only pay your own fines"})
			return
		}

		// Check if fine is already paid
		if fine.IsPaid {
			c.JSON(http.StatusConflict, gin.H{"error": "Fine is already paid"})
			return
		}

		// Pay the fine
		if err := fineRepo.PayFine(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to pay fine"})
			return
		}

		if db.Cache != nil {
			db.Cache.Delete(adminDashboardCacheKey)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Fine paid successfully"})
	}
}

func getFineSummaryHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		fineRepo := repository.NewFineRepository(db.DB)

		// Get all user's fines
		fines, _, err := fineRepo.List(c.Request.Context(), 1, 1000, "", nil, &userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fines"})
			return
		}

		// Calculate summary
		var totalFines, paidFines, unpaidFines float64
		var totalCount, paidCount, unpaidCount int

		for _, fine := range fines {
			totalFines += fine.Amount
			totalCount++
			if fine.IsPaid {
				paidFines += fine.Amount
				paidCount++
			} else {
				unpaidFines += fine.Amount
				unpaidCount++
			}
		}

		summary := models.FineSummary{
			TotalFines:       totalFines,
			PaidFines:        paidFines,
			UnpaidFines:      unpaidFines,
			TotalFinesCount:  totalCount,
			PaidFinesCount:   paidCount,
			UnpaidFinesCount: unpaidCount,
		}
		c.JSON(http.StatusOK, gin.H{"summary": summary})
	}
}

// Admin handlers
func getUsersHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRepo := repository.NewUserRepository(db.DB)

		// Get query parameters
		page := 1
		limit := 50
		search := c.Query("search")
		role := c.Query("role")

		if pageStr := c.Query("page"); pageStr != "" {
			if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
				page = p
			}
		}

		if limitStr := c.Query("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
				limit = l
			}
		}

		// Get users
		users, total, err := userRepo.List(c.Request.Context(), page, limit, search, role, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
			return
		}

		// Convert to response format
		var userResponses []models.UserResponse
		for _, user := range users {
			userResponses = append(userResponses, user.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{
			"data":  userResponses,
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": int(math.Ceil(float64(total) / float64(limit))),
		})
	}
}

func getUserHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRepo := repository.NewUserRepository(db.DB)

		// Get user ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Get user
		user, err := userRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"user": user.ToResponse()})
	}
}

func updateUserHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRepo := repository.NewUserRepository(db.DB)

		// Get user ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Get user
		user, err := userRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
			return
		}

		// Parse request body
		var req models.UserUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Update user fields
		if req.FirstName != "" {
			user.FirstName = req.FirstName
		}
		if req.LastName != "" {
			user.LastName = req.LastName
		}
		if req.Phone != "" {
			user.Phone = req.Phone
		}

		// Save user
		if err := userRepo.Update(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User updated successfully", "user": user.ToResponse()})
	}
}

func deleteUserHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRepo := repository.NewUserRepository(db.DB)

		// Get user ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Check if user exists
		user, err := userRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
			return
		}

		// Don't allow deleting admin users
		if user.Role == "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete admin users"})
			return
		}

		// Delete user
		if err := userRepo.Delete(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
	}
}

func activateUserHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRepo := repository.NewUserRepository(db.DB)

		// Get user ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Get user
		user, err := userRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
			return
		}

		// Activate user
		user.IsActive = true
		if err := userRepo.Update(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User activated successfully"})
	}
}

func deactivateUserHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRepo := repository.NewUserRepository(db.DB)

		// Get user ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		// Get user
		user, err := userRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
			return
		}

		// Don't allow deactivating admin users
		if user.Role == "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot deactivate admin users"})
			return
		}

		// Deactivate user
		user.IsActive = false
		if err := userRepo.Update(c.Request.Context(), user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User deactivated successfully"})
	}
}

func createBookHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Parse request body
		var req models.BookCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Check if book with ISBN already exists
		existingBook, err := bookRepo.GetByISBN(c.Request.Context(), req.ISBN)
		if err == nil && existingBook != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Book with this ISBN already exists"})
			return
		}

		// Create book
		book := &models.Book{
			Title:           req.Title,
			Author:          req.Author,
			ISBN:            req.ISBN,
			Category:        req.Category,
			PublishedDate:   req.PublishedDate,
			Description:     req.Description,
			TotalCopies:     req.Copies,
			AvailableCopies: req.Copies,
		}

		if err := bookRepo.Create(c.Request.Context(), book); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create book"})
			return
		}

		if db.Cache != nil {
			db.Cache.Delete(adminDashboardCacheKey)
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Book created successfully", "book": book.ToResponse()})
	}
}

func updateBookHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Get book ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
			return
		}

		// Get book
		book, err := bookRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get book"})
			return
		}

		// Parse request body
		var req models.BookUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Update book fields
		if req.Title != "" {
			book.Title = req.Title
		}
		if req.Author != "" {
			book.Author = req.Author
		}
		if req.Category != "" {
			book.Category = req.Category
		}
		if req.Description != "" {
			book.Description = req.Description
		}
		if req.PublishedDate != nil {
			book.PublishedDate = req.PublishedDate
		}
		if req.Copies > 0 {
			// Update available copies proportionally
			oldRatio := float64(book.AvailableCopies) / float64(book.TotalCopies)
			book.TotalCopies = req.Copies
			book.AvailableCopies = int(float64(req.Copies) * oldRatio)
		}

		// Save book
		if err := bookRepo.Update(c.Request.Context(), book); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book"})
			return
		}

		if db.Cache != nil {
			db.Cache.Delete(adminDashboardCacheKey)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Book updated successfully", "book": book.ToResponse()})
	}
}

func deleteBookHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Get book ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
			return
		}

		// Check if book exists
		book, err := bookRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get book"})
			return
		}

		// Check if book is currently borrowed
		if book.AvailableCopies < book.TotalCopies {
			c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete book that is currently borrowed"})
			return
		}

		// Delete book
		if err := bookRepo.Delete(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete book"})
			return
		}

		if db.Cache != nil {
			db.Cache.Delete(adminDashboardCacheKey)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Book deleted successfully"})
	}
}

func updateBookCopiesHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Get book ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
			return
		}

		// Get book
		book, err := bookRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get book"})
			return
		}

		// Parse request body
		var req struct {
			AvailableCopies int `json:"availableCopies" validate:"required,min=0"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Update available copies
		if req.AvailableCopies > book.TotalCopies {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Available copies cannot exceed total copies"})
			return
		}

		book.AvailableCopies = req.AvailableCopies
		if err := bookRepo.Update(c.Request.Context(), book); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book copies"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Book copies updated successfully", "book": book.ToResponse()})
	}
}

func getAdminBooksHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Get query parameters
		page := 1
		limit := 50
		search := c.Query("search")
		category := c.Query("category")
		status := c.Query("status")

		if pageStr := c.Query("page"); pageStr != "" {
			if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
				page = p
			}
		}

		if limitStr := c.Query("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
				limit = l
			}
		}

		// Get books
		books, total, err := bookRepo.List(c.Request.Context(), page, limit, search, category, status)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get books"})
			return
		}

		// Convert to response format
		var bookResponses []models.BookResponse
		for _, book := range books {
			bookResponses = append(bookResponses, book.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{
			"books": bookResponses,
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": int(math.Ceil(float64(total) / float64(limit))),
		})
	}
}

func getAllBorrowsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		borrowRepo := repository.NewBorrowRepository(db.DB)

		// Get query parameters
		page := 1
		limit := 50
		search := c.Query("search")
		status := c.Query("status")

		if pageStr := c.Query("page"); pageStr != "" {
			if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
				page = p
			}
		}

		if limitStr := c.Query("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
				limit = l
			}
		}

		// Get borrows
		borrows, total, err := borrowRepo.List(c.Request.Context(), page, limit, search, status, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrows"})
			return
		}

		// Convert to response format
		var borrowResponses []models.BorrowResponse
		for _, borrow := range borrows {
			borrowResponses = append(borrowResponses, borrow.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{
			"borrows": borrowResponses,
			"total":   total,
			"page":    page,
			"limit":   limit,
			"pages":   int(math.Ceil(float64(total) / float64(limit))),
		})
	}
}

func extendBorrowHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		borrowRepo := repository.NewBorrowRepository(db.DB)

		// Get borrow ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid borrow ID"})
			return
		}

		// Get borrow
		borrow, err := borrowRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Borrow not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrow"})
			return
		}

		// Check if borrow is already returned
		if borrow.ReturnedAt != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot extend already returned borrow"})
			return
		}

		// Parse request body
		var req struct {
			NewDueDate string `json:"newDueDate" validate:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Parse new due date
		newDueDate, err := time.Parse("2006-01-02", req.NewDueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}

		// Check if new due date is in the future
		if newDueDate.Before(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "New due date must be in the future"})
			return
		}

		// Extend borrow
		if err := borrowRepo.ExtendBorrow(c.Request.Context(), uint(id), newDueDate); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to extend borrow"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Borrow extended successfully"})
	}
}

func forceReturnBorrowHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		borrowRepo := repository.NewBorrowRepository(db.DB)
		bookRepo := repository.NewBookRepository(db.DB)

		// Get borrow ID from URL
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid borrow ID"})
			return
		}

		// Get borrow
		borrow, err := borrowRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Borrow not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrow"})
			return
		}

		// Check if borrow is already returned
		if borrow.ReturnedAt != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Borrow is already returned"})
			return
		}

		// Return book
		if err := borrowRepo.ReturnBook(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to return book"})
			return
		}

		// Increment available copies
		if err := bookRepo.IncrementAvailableCopies(c.Request.Context(), borrow.BookID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book copies"})
			return
		}

		if db.Cache != nil {
			db.Cache.Delete(adminDashboardCacheKey)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Book force returned successfully"})
	}
}

func getAllReservationsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		reservationRepo := repository.NewReservationRepository(db.DB)

		// Get query parameters
		page := 1
		limit := 50
		search := c.Query("search")
		status := c.Query("status")

		if pageStr := c.Query("page"); pageStr != "" {
			if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
				page = p
			}
		}

		if limitStr := c.Query("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
				limit = l
			}
		}

		// Get reservations
		reservations, total, err := reservationRepo.List(c.Request.Context(), page, limit, search, status, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservations"})
			return
		}

		// Convert to response format
		var reservationResponses []models.ReservationResponse
		for _, reservation := range reservations {
			reservationResponses = append(reservationResponses, reservation.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{
			"reservations": reservationResponses,
			"total":        total,
			"page":         page,
			"limit":        limit,
			"pages":        int(math.Ceil(float64(total) / float64(limit))),
		})
	}
}

func fulfillReservationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		reservationRepo := repository.NewReservationRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
			return
		}

		reservation, err := reservationRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservation"})
			return
		}

		if reservation.Status != "active" {
			c.JSON(http.StatusConflict, gin.H{"error": "Only active reservations can be fulfilled"})
			return
		}

		if err := reservationRepo.Fulfill(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fulfill reservation"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Reservation fulfilled successfully"})
	}
}

func getAllFinesHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		fineRepo := repository.NewFineRepository(db.DB)

		// Get query parameters
		page := 1
		limit := 50
		search := c.Query("search")
		isPaidStr := c.Query("isPaid")

		if pageStr := c.Query("page"); pageStr != "" {
			if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
				page = p
			}
		}

		if limitStr := c.Query("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
				limit = l
			}
		}

		// Parse isPaid parameter
		var isPaid *bool
		if isPaidStr != "" {
			if isPaidBool, err := strconv.ParseBool(isPaidStr); err == nil {
				isPaid = &isPaidBool
			}
		}

		// Get fines
		fines, total, err := fineRepo.List(c.Request.Context(), page, limit, search, isPaid, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fines"})
			return
		}

		// Convert to response format
		var fineResponses []models.FineResponse
		for _, fine := range fines {
			fineResponses = append(fineResponses, fine.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{
			"fines": fineResponses,
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": int(math.Ceil(float64(total) / float64(limit))),
		})
	}
}

func createFineHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		fineRepo := repository.NewFineRepository(db.DB)
		borrowRepo := repository.NewBorrowRepository(db.DB)

		var req struct {
			BorrowID uint    `json:"borrowId" binding:"required"`
			Amount   float64 `json:"amount" binding:"required,gt=0"`
			Reason   string  `json:"reason" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		borrow, err := borrowRepo.GetByID(c.Request.Context(), req.BorrowID)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Borrow not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrow"})
			return
		}

		dueDate := time.Now().AddDate(0, 0, 30)
		fine := &models.Fine{
			UserID:   borrow.UserID,
			BorrowID: req.BorrowID,
			Amount:   req.Amount,
			Reason:   req.Reason,
			DueDate:  dueDate,
		}

		if err := fineRepo.Create(c.Request.Context(), fine); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create fine"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Fine created successfully", "fine": fine.ToResponse()})
	}
}

func updateFineHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		fineRepo := repository.NewFineRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fine ID"})
			return
		}

		fine, err := fineRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Fine not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fine"})
			return
		}

		var req struct {
			Amount float64 `json:"amount"`
			Reason string  `json:"reason"`
			IsPaid bool    `json:"isPaid"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		if req.Amount > 0 {
			fine.Amount = req.Amount
		}
		if req.Reason != "" {
			fine.Reason = req.Reason
		}
		if req.IsPaid && !fine.IsPaid {
			fine.MarkAsPaid()
		}

		if err := fineRepo.Update(c.Request.Context(), fine); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update fine"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Fine updated successfully", "fine": fine.ToResponse()})
	}
}

func deleteFineHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		fineRepo := repository.NewFineRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fine ID"})
			return
		}

		if _, err := fineRepo.GetByID(c.Request.Context(), uint(id)); err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Fine not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fine"})
			return
		}

		if err := fineRepo.Delete(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete fine"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Fine deleted successfully"})
	}
}

func getOverviewReportHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get basic counts from each repository
		userRepo := repository.NewUserRepository(db.DB)
		bookRepo := repository.NewBookRepository(db.DB)

		// Get total counts
		users, totalUsers, _ := userRepo.List(c.Request.Context(), 1, 1, "", "", nil)
		books, totalBooks, _ := bookRepo.List(c.Request.Context(), 1, 1, "", "", "")

		report := map[string]interface{}{
			"totalUsers":     totalUsers,
			"totalBooks":     totalBooks,
			"activeUsers":    len(users),
			"availableBooks": len(books),
			"timestamp":      time.Now(),
		}

		c.JSON(http.StatusOK, gin.H{"report": report})
	}
}

func getBookReportHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		bookRepo := repository.NewBookRepository(db.DB)

		// Get book categories
		categories, err := bookRepo.GetCategories(c.Request.Context())
		if err != nil {
			categories = []string{} // Don't fail for this
		}

		// Get total book count
		_, totalBooks, _ := bookRepo.List(c.Request.Context(), 1, 1, "", "", "")

		report := map[string]interface{}{
			"totalBooks": totalBooks,
			"categories": categories,
			"timestamp":  time.Now(),
		}

		c.JSON(http.StatusOK, gin.H{"report": report})
	}
}

func getUserReportHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRepo := repository.NewUserRepository(db.DB)

		// Get total user count
		_, totalUsers, _ := userRepo.List(c.Request.Context(), 1, 1, "", "", nil)

		// Get recent users
		recentUsers, _, _ := userRepo.List(c.Request.Context(), 1, 5, "", "", nil)

		var userSummary []map[string]interface{}
		for _, user := range recentUsers {
			userSummary = append(userSummary, map[string]interface{}{
				"id":       user.ID,
				"name":     user.FirstName + " " + user.LastName,
				"email":    user.Email,
				"role":     user.Role,
				"joinDate": user.CreatedAt,
			})
		}

		report := map[string]interface{}{
			"totalUsers":  totalUsers,
			"recentUsers": userSummary,
			"timestamp":   time.Now(),
		}

		c.JSON(http.StatusOK, gin.H{"report": report})
	}
}

func getFineReportHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		fineRepo := repository.NewFineRepository(db.DB)

		// Get total fine count
		_, totalFines, _ := fineRepo.List(c.Request.Context(), 1, 1, "", nil, nil)

		// Get recent fines
		recentFines, _, _ := fineRepo.List(c.Request.Context(), 1, 10, "", nil, nil)

		var recentFineSummary []map[string]interface{}
		var totalAmount float64
		var paidCount int

		for _, fine := range recentFines {
			recentFineSummary = append(recentFineSummary, map[string]interface{}{
				"id":        fine.ID,
				"amount":    fine.Amount,
				"reason":    fine.Reason,
				"isPaid":    fine.IsPaid,
				"dueDate":   fine.DueDate,
				"createdAt": fine.CreatedAt,
			})
			totalAmount += fine.Amount
			if fine.IsPaid {
				paidCount++
			}
		}

		report := map[string]interface{}{
			"totalFines":  totalFines,
			"totalAmount": totalAmount,
			"paidCount":   paidCount,
			"unpaidCount": len(recentFines) - paidCount,
			"recentFines": recentFineSummary,
			"timestamp":   time.Now(),
		}

		c.JSON(http.StatusOK, gin.H{"report": report})
	}
}

const adminDashboardCacheKey = "admin:dashboard"
const adminDashboardCacheTTL = 5 * time.Minute

func getAdminDashboardHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Serve from cache when available — avoids ~9 DB queries per request.
		if db.Cache != nil {
			var cached gin.H
			if db.Cache.GetJSON(adminDashboardCacheKey, &cached) {
				c.JSON(http.StatusOK, cached)
				return
			}
		}

		bookRepo := repository.NewBookRepository(db.DB)
		borrowRepo := repository.NewBorrowRepository(db.DB)
		reservationRepo := repository.NewReservationRepository(db.DB)
		fineRepo := repository.NewFineRepository(db.DB)
		userRepo := repository.NewUserRepository(db.DB)

		_, totalBooks, err := bookRepo.List(ctx, 1, 1, "", "", "")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get book statistics"})
			return
		}

		_, totalUsers, err := userRepo.List(ctx, 1, 1, "", "", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user statistics"})
			return
		}

		borrowStats, err := borrowRepo.GetBorrowStats(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get borrow statistics"})
			return
		}

		reservationStats, err := reservationRepo.GetReservationStats(ctx)
		if err != nil {
			reservationStats = map[string]interface{}{"totalReservations": int64(0)}
		}

		fineStats, err := fineRepo.GetFineStats(ctx)
		if err != nil {
			fineStats = map[string]interface{}{"totalAmount": float64(0)}
		}

		overdueBooks, err := bookRepo.GetOverdueBooks(ctx)
		if err != nil {
			overdueBooks = nil
		}

		popularBooks, err := bookRepo.GetPopularBooks(ctx, 5)
		if err != nil {
			popularBooks = nil
		}

		var popularBooksResponse []gin.H
		for _, book := range popularBooks {
			bookStats, _ := bookRepo.GetBookStats(ctx, book.ID)
			popularBooksResponse = append(popularBooksResponse, gin.H{
				"book":        book.ToResponse(),
				"borrowCount": bookStats["totalBorrows"],
			})
		}

		adminStats := gin.H{
			"totalBooks":        totalBooks,
			"totalUsers":        totalUsers,
			"totalBorrows":      borrowStats["totalBorrows"],
			"activeBorrows":     borrowStats["activeBorrows"],
			"overdueBorrows":    borrowStats["overdueBorrows"],
			"totalReservations": reservationStats["totalReservations"],
			"overdueBooks":      int64(len(overdueBooks)),
			"totalFines":        fineStats["totalAmount"],
			"popularBooks":      popularBooksResponse,
		}

		if db.Cache != nil {
			db.Cache.SetJSON(adminDashboardCacheKey, adminStats, adminDashboardCacheTTL)
		}

		c.JSON(http.StatusOK, adminStats)
	}
}

// WebSocket handlers
func notificationHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		// WebSocket implementation would go here
		c.JSON(http.StatusOK, gin.H{"message": "WebSocket endpoint"})
	}
}

func chatHandler(cfg *config.Config, db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		// WebSocket implementation would go here
		c.JSON(http.StatusOK, gin.H{"message": "Chat endpoint"})
	}
}

// Notification handlers
func getNotificationsHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		notificationRepo := repository.NewNotificationRepository(db.DB)

		// Parse query parameters
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		isReadStr := c.Query("isRead")
		category := c.Query("category")
		notificationType := c.Query("type")

		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 10
		}

		var isRead *bool
		if isReadStr != "" {
			isReadVal := isReadStr == "true"
			isRead = &isReadVal
		}

		// Get user's notifications with pagination
		notifications, total, err := notificationRepo.List(c.Request.Context(), userID, page, limit, isRead, category, notificationType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get notifications"})
			return
		}

		// Convert to response format
		var notificationResponses []models.NotificationResponse
		for _, notification := range notifications {
			notificationResponses = append(notificationResponses, notification.ToResponse())
		}

		totalPages := int(math.Ceil(float64(total) / float64(limit)))

		// Get unread count
		unreadCount, err := notificationRepo.GetUnreadCountByUserID(c.Request.Context(), userID)
		if err != nil {
			unreadCount = 0 // Don't fail the request for this
		}

		c.JSON(http.StatusOK, gin.H{
			"notifications": notificationResponses,
			"total":         total,
			"page":          page,
			"limit":         limit,
			"pages":         totalPages,
			"unreadCount":   unreadCount,
		})
	}
}

func getUnreadNotificationCountHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		notificationRepo := repository.NewNotificationRepository(db.DB)

		count, err := notificationRepo.GetUnreadCountByUserID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get unread count"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"count": count})
	}
}

func markNotificationAsReadHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		notificationRepo := repository.NewNotificationRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
			return
		}

		// Get notification to verify ownership
		notification, err := notificationRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get notification"})
			return
		}

		// Check if user owns this notification
		if notification.UserID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only mark your own notifications as read"})
			return
		}

		// Mark as read
		if err := notificationRepo.MarkAsRead(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
	}
}

func markAllNotificationsAsReadHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		notificationRepo := repository.NewNotificationRepository(db.DB)

		// Mark all user's notifications as read
		if err := notificationRepo.MarkAllAsRead(c.Request.Context(), userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all notifications as read"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
	}
}

func deleteNotificationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetCurrentUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		notificationRepo := repository.NewNotificationRepository(db.DB)

		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
			return
		}

		// Get notification to verify ownership
		notification, err := notificationRepo.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get notification"})
			return
		}

		// Check if user owns this notification
		if notification.UserID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own notifications"})
			return
		}

		// Delete the notification
		if err := notificationRepo.Delete(c.Request.Context(), uint(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Notification deleted successfully"})
	}
}

func createNotificationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		notificationRepo := repository.NewNotificationRepository(db.DB)

		var req models.NotificationCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		// Create notification
		notification := &models.Notification{
			UserID:     req.UserID,
			Title:      req.Title,
			Message:    req.Message,
			Type:       req.Type,
			Category:   req.Category,
			EntityID:   req.EntityID,
			EntityType: req.EntityType,
			ActionURL:  req.ActionURL,
			IsRead:     false,
		}

		if err := notificationRepo.Create(c.Request.Context(), notification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":      "Notification created successfully",
			"notification": notification.ToResponse(),
		})
	}
}

// Smart notification generators
func generateBookReturnReminderHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			BorrowID uint `json:"borrowId" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		borrowRepo := repository.NewBorrowRepository(db.DB)
		notificationRepo := repository.NewNotificationRepository(db.DB)

		// Get borrow details
		borrow, err := borrowRepo.GetByID(c.Request.Context(), req.BorrowID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Borrow not found"})
			return
		}

		// Create return reminder notification
		notification := &models.Notification{
			UserID:     borrow.UserID,
			Title:      "Book Return Reminder",
			Message:    fmt.Sprintf("Remember to return '%s' by %s", borrow.Book.Title, borrow.DueDate.Format("2006-01-02")),
			Type:       "info",
			Category:   "borrow",
			EntityID:   &req.BorrowID,
			EntityType: "borrow",
			ActionURL:  "/borrows",
			IsRead:     false,
		}

		if err := notificationRepo.Create(c.Request.Context(), notification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Return reminder notification created"})
	}
}

func generateOverdueNotificationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			BorrowID uint `json:"borrowId" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		borrowRepo := repository.NewBorrowRepository(db.DB)
		notificationRepo := repository.NewNotificationRepository(db.DB)

		// Get borrow details
		borrow, err := borrowRepo.GetByID(c.Request.Context(), req.BorrowID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Borrow not found"})
			return
		}

		// Create overdue notification
		daysOverdue := int(time.Since(borrow.DueDate).Hours() / 24)
		notification := &models.Notification{
			UserID:     borrow.UserID,
			Title:      "Overdue Book",
			Message:    fmt.Sprintf("'%s' is %d days overdue. Please return it as soon as possible.", borrow.Book.Title, daysOverdue),
			Type:       "warning",
			Category:   "borrow",
			EntityID:   &req.BorrowID,
			EntityType: "borrow",
			ActionURL:  "/borrows",
			IsRead:     false,
		}

		if err := notificationRepo.Create(c.Request.Context(), notification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Overdue notification created"})
	}
}

func generateReservationAvailableHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			ReservationID uint `json:"reservationId" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		reservationRepo := repository.NewReservationRepository(db.DB)
		notificationRepo := repository.NewNotificationRepository(db.DB)

		// Get reservation details
		reservation, err := reservationRepo.GetByID(c.Request.Context(), req.ReservationID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
			return
		}

		// Create reservation available notification
		notification := &models.Notification{
			UserID:     reservation.UserID,
			Title:      "Reserved Book Available",
			Message:    fmt.Sprintf("'%s' is now available for pickup. Your reservation expires on %s.", reservation.Book.Title, reservation.ExpiresAt.Format("2006-01-02")),
			Type:       "success",
			Category:   "reservation",
			EntityID:   &req.ReservationID,
			EntityType: "reservation",
			ActionURL:  "/reservations",
			IsRead:     false,
		}

		if err := notificationRepo.Create(c.Request.Context(), notification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Reservation available notification created"})
	}
}

func generateFineNotificationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			FineID uint `json:"fineId" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		fineRepo := repository.NewFineRepository(db.DB)
		notificationRepo := repository.NewNotificationRepository(db.DB)

		// Get fine details
		fine, err := fineRepo.GetByID(c.Request.Context(), req.FineID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Fine not found"})
			return
		}

		// Create fine notification
		notification := &models.Notification{
			UserID:     fine.UserID,
			Title:      "New Fine",
			Message:    fmt.Sprintf("You have a new fine of $%.2f for '%s'. Please pay by %s.", fine.Amount, fine.Reason, fine.DueDate.Format("2006-01-02")),
			Type:       "warning",
			Category:   "fine",
			EntityID:   &req.FineID,
			EntityType: "fine",
			ActionURL:  "/fines",
			IsRead:     false,
		}

		if err := notificationRepo.Create(c.Request.Context(), notification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Fine notification created"})
	}
}

func generateNewBookNotificationHandler(db *database.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			BookID   uint   `json:"bookId" binding:"required"`
			Category string `json:"category"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
			return
		}

		bookRepo := repository.NewBookRepository(db.DB)
		userRepo := repository.NewUserRepository(db.DB)
		notificationRepo := repository.NewNotificationRepository(db.DB)

		// Get book details
		book, err := bookRepo.GetByID(c.Request.Context(), req.BookID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
			return
		}

		// Get all users to notify about new book
		users, _, err := userRepo.List(c.Request.Context(), 1, 1000, "", "", nil) // Get all users
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
			return
		}

		// Create notifications for all users
		var createdCount int
		for _, user := range users {
			notification := &models.Notification{
				UserID:     user.ID,
				Title:      "New Book Available",
				Message:    fmt.Sprintf("A new book '%s' by %s is now available in the library!", book.Title, book.Author),
				Type:       "info",
				Category:   "book",
				EntityID:   &req.BookID,
				EntityType: "book",
				ActionURL:  fmt.Sprintf("/books/%d", book.ID),
				IsRead:     false,
			}

			if err := notificationRepo.Create(c.Request.Context(), notification); err == nil {
				createdCount++
			}
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": fmt.Sprintf("New book notifications created for %d users", createdCount),
		})
	}
}

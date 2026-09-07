package server

import (
	"context"
	"net/http"
	"time"

	"library-management-system-backend/internal/config"
	"library-management-system-backend/internal/database"
	"library-management-system-backend/internal/middleware"
	"library-management-system-backend/internal/routes"

	"github.com/gin-gonic/gin"
)

type Server struct {
	config *config.Config
	db     *database.Database
	router *gin.Engine
	server *http.Server
}

func NewServer(cfg *config.Config, db *database.Database) *Server {
	// Set Gin mode based on environment
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Use custom middleware
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.CORS())
	router.Use(middleware.SecurityHeaders())

	// Create server instance
	srv := &Server{
		config: cfg,
		db:     db,
		router: router,
	}

	// Setup routes
	srv.setupRoutes()

	// Create HTTP server
	srv.server = &http.Server{
		Addr:         ":8080", // Will be overridden in Start()
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return srv
}

func (s *Server) setupRoutes() {
	// Health check endpoint
	s.router.GET("/health", s.healthCheck)
	s.router.GET("/ready", s.readinessCheck)

	// API routes
	api := s.router.Group("/api/v1")
	{
		// Public routes (no authentication required)
		public := api.Group("")
		{
			routes.SetupAuthRoutes(public, s.config, s.db)
		}

		// Protected routes (authentication required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(s.config))
		{
			routes.SetupProtectedAuthRoutes(protected, s.config, s.db)
			routes.SetupUserRoutes(protected, s.config, s.db)
			routes.SetupBookRoutes(protected, s.config, s.db)
			routes.SetupBorrowRoutes(protected, s.config, s.db)
			routes.SetupReservationRoutes(protected, s.config, s.db)
			routes.SetupFineRoutes(protected, s.config, s.db)
			routes.SetupNotificationRoutes(protected, s.config, s.db)
		}

		// Admin routes (admin role required)
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(s.config))
		admin.Use(middleware.AdminMiddleware())
		{
			routes.SetupAdminRoutes(admin, s.config, s.db)
		}
	}

	// WebSocket routes
	ws := s.router.Group("/ws")
	ws.Use(middleware.AuthMiddleware(s.config))
	{
		routes.SetupWebSocketRoutes(ws, s.config, s.db)
	}
}

func (s *Server) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"service":   "library-management-system-backend",
		"version":   "1.0.0",
	})
}

func (s *Server) readinessCheck(c *gin.Context) {
	// Check database connectivity
	if err := s.db.HealthCheck(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    "not ready",
			"error":     "database connection failed",
			"timestamp": time.Now().UTC(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"timestamp": time.Now().UTC(),
		"services": gin.H{
			"database": "connected",
		},
	})
}

func (s *Server) Start(addr string) error {
	s.server.Addr = addr
	return s.server.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func (s *Server) GetRouter() *gin.Engine {
	return s.router
}

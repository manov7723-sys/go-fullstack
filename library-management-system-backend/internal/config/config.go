package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server    ServerConfig    `mapstructure:"server"`
	Database  DatabaseConfig  `mapstructure:"database"`
	Redis     RedisConfig     `mapstructure:"redis"`
	JWT       JWTConfig       `mapstructure:"jwt"`
	Email     EmailConfig     `mapstructure:"email"`
	RateLimit RateLimitConfig `mapstructure:"rate_limit"`
	Logging   LoggingConfig   `mapstructure:"logging"`
}

type ServerConfig struct {
	Port        string `mapstructure:"port"`
	Host        string `mapstructure:"host"`
	Environment string `mapstructure:"environment"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	Name     string `mapstructure:"name"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	SSLMode  string `mapstructure:"ssl_mode"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type JWTConfig struct {
	Secret        string        `mapstructure:"secret"`
	Expiry        time.Duration `mapstructure:"expiry"`
	RefreshExpiry time.Duration `mapstructure:"refresh_expiry"`
}

type EmailConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
}

type RateLimitConfig struct {
	Requests int           `mapstructure:"requests"`
	Window   time.Duration `mapstructure:"window"`
}

type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

func Load() (*Config, error) {
	viper.SetConfigName("env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./backend")
	viper.AutomaticEnv()

	// Set defaults
	setDefaults()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Manually map environment variables to config fields
	config.Database.Host = viper.GetString("DB_HOST")
	config.Database.Port = viper.GetString("DB_PORT")
	config.Database.Name = viper.GetString("DB_NAME")
	config.Database.User = viper.GetString("DB_USER")
	config.Database.Password = viper.GetString("DB_PASSWORD")
	config.Database.SSLMode = viper.GetString("DB_SSL_MODE")

	config.Server.Port = viper.GetString("SERVER_PORT")
	config.Server.Host = viper.GetString("SERVER_HOST")
	config.Server.Environment = viper.GetString("ENVIRONMENT")

	config.Redis.Host = viper.GetString("REDIS_HOST")
	config.Redis.Port = viper.GetString("REDIS_PORT")
	config.Redis.Password = viper.GetString("REDIS_PASSWORD")
	config.Redis.DB = viper.GetInt("REDIS_DB")

	config.JWT.Secret = viper.GetString("JWT_SECRET")
	if expiryStr := viper.GetString("JWT_EXPIRY"); expiryStr != "" {
		if expiry, err := time.ParseDuration(expiryStr); err == nil {
			config.JWT.Expiry = expiry
		}
	}
	if refreshExpiryStr := viper.GetString("JWT_REFRESH_EXPIRY"); refreshExpiryStr != "" {
		if refreshExpiry, err := time.ParseDuration(refreshExpiryStr); err == nil {
			config.JWT.RefreshExpiry = refreshExpiry
		}
	}

	return &config, nil
}

func setDefaults() {
	// Server defaults
	viper.SetDefault("SERVER_PORT", "8080")
	viper.SetDefault("SERVER_HOST", "localhost")
	viper.SetDefault("ENVIRONMENT", "development")

	// Database defaults
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_NAME", "library_db")
	viper.SetDefault("DB_USER", "library_user")
	viper.SetDefault("DB_PASSWORD", "")
	viper.SetDefault("DB_SSL_MODE", "disable")

	// Redis defaults
	viper.SetDefault("REDIS_HOST", "localhost")
	viper.SetDefault("REDIS_PORT", "6379")
	viper.SetDefault("REDIS_PASSWORD", "")
	viper.SetDefault("REDIS_DB", 0)

	// JWT defaults
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-in-production")
	viper.SetDefault("JWT_EXPIRY", "24h")
	viper.SetDefault("JWT_REFRESH_EXPIRY", "168h")

	// Email defaults
	viper.SetDefault("SMTP_HOST", "smtp.gmail.com")
	viper.SetDefault("SMTP_PORT", 587)
	viper.SetDefault("SMTP_USER", "")
	viper.SetDefault("SMTP_PASSWORD", "")

	// Rate limiting defaults
	viper.SetDefault("RATE_LIMIT_REQUESTS", 100)
	viper.SetDefault("RATE_LIMIT_WINDOW", "1m")

	// Logging defaults
	viper.SetDefault("LOG_LEVEL", "info")
	viper.SetDefault("LOG_FORMAT", "json")
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

func (c *Config) GetRedisAddr() string {
	return fmt.Sprintf("%s:%s", c.Redis.Host, c.Redis.Port)
}

func (c *Config) IsDevelopment() bool {
	return c.Server.Environment == "development"
}

func (c *Config) IsProduction() bool {
	return c.Server.Environment == "production"
}

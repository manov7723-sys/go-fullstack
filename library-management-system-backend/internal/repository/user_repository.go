package repository

import (
	"context"
	"fmt"
	"time"

	"library-management-system-backend/internal/models"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).First(&user, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

// Update updates a user
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// Delete deletes a user (soft delete)
func (r *UserRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.User{}, id).Error
}

// List retrieves users with pagination and filtering
func (r *UserRepository) List(ctx context.Context, page, limit int, search, role string, isActive *bool) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := r.db.WithContext(ctx).Model(&models.User{})

	// Apply search filter
	if search != "" {
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Apply role filter
	if role != "" {
		query = query.Where("role = ?", role)
	}

	// Apply active status filter
	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&users).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}

	return users, total, nil
}

// GetWithBorrows retrieves a user with their borrows
func (r *UserRepository) GetWithBorrows(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Borrows").
		Preload("Borrows.Book").
		First(&user, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get user with borrows: %w", err)
	}
	return &user, nil
}

// GetWithReservations retrieves a user with their reservations
func (r *UserRepository) GetWithReservations(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Reservations").
		Preload("Reservations.Book").
		First(&user, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get user with reservations: %w", err)
	}
	return &user, nil
}

// GetWithFines retrieves a user with their fines
func (r *UserRepository) GetWithFines(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Fines").
		Preload("Fines.Borrow").
		First(&user, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get user with fines: %w", err)
	}
	return &user, nil
}

// GetActiveBorrows retrieves active borrows for a user
func (r *UserRepository) GetActiveBorrows(ctx context.Context, userID uint) ([]models.Borrow, error) {
	var borrows []models.Borrow
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND status = ?", userID, "borrowed").
		Preload("Book").
		Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get active borrows: %w", err)
	}
	return borrows, nil
}

// GetOverdueBorrows retrieves overdue borrows for a user
func (r *UserRepository) GetOverdueBorrows(ctx context.Context, userID uint) ([]models.Borrow, error) {
	var borrows []models.Borrow
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND due_date < ? AND status = ?", userID, time.Now(), "borrowed").
		Preload("Book").
		Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get overdue borrows: %w", err)
	}
	return borrows, nil
}

// GetUnpaidFines retrieves unpaid fines for a user
func (r *UserRepository) GetUnpaidFines(ctx context.Context, userID uint) ([]models.Fine, error) {
	var fines []models.Fine
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND is_paid = ?", userID, false).
		Preload("Borrow").
		Preload("Borrow.Book").
		Find(&fines).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get unpaid fines: %w", err)
	}
	return fines, nil
}

// GetTotalUnpaidFines calculates total unpaid fines for a user
func (r *UserRepository) GetTotalUnpaidFines(ctx context.Context, userID uint) (float64, error) {
	var total float64
	err := r.db.WithContext(ctx).
		Model(&models.Fine{}).
		Where("user_id = ? AND is_paid = ?", userID, false).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	if err != nil {
		return 0, fmt.Errorf("failed to get total unpaid fines: %w", err)
	}
	return total, nil
}

// CheckEmailExists checks if an email already exists
func (r *UserRepository) CheckEmailExists(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("email = ?", email).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}
	return count > 0, nil
}

// GetUserStats retrieves user statistics
// GetUserStats retrieves dashboard statistics for a user in two queries (borrows + fines).
func (r *UserRepository) GetUserStats(ctx context.Context, userID uint) (map[string]interface{}, error) {
	type borrowRow struct {
		Total   int64 `gorm:"column:total"`
		Active  int64 `gorm:"column:active"`
		Overdue int64 `gorm:"column:overdue"`
	}
	var br borrowRow
	now := time.Now()
	if err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'borrowed')                         AS active,
			COUNT(*) FILTER (WHERE status = 'borrowed' AND due_date < ?)        AS overdue
		FROM borrows WHERE user_id = ? AND deleted_at IS NULL
	`, now, userID).Scan(&br).Error; err != nil {
		return nil, fmt.Errorf("failed to get user borrow stats: %w", err)
	}

	type fineRow struct {
		Total  float64 `gorm:"column:total_fines"`
		Unpaid float64 `gorm:"column:unpaid_fines"`
	}
	var fr fineRow
	if err := r.db.WithContext(ctx).Raw(`
		SELECT
			COALESCE(SUM(amount), 0)                                       AS total_fines,
			COALESCE(SUM(amount) FILTER (WHERE is_paid = false), 0)        AS unpaid_fines
		FROM fines WHERE user_id = ? AND deleted_at IS NULL
	`, userID).Scan(&fr).Error; err != nil {
		return nil, fmt.Errorf("failed to get user fine stats: %w", err)
	}

	return map[string]interface{}{
		"totalBorrows":   br.Total,
		"activeBorrows":  br.Active,
		"overdueBorrows": br.Overdue,
		"totalFines":     fr.Total,
		"unpaidFines":    fr.Unpaid,
	}, nil
}

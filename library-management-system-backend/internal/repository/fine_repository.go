package repository

import (
	"context"
	"fmt"
	"time"

	"library-management-system-backend/internal/models"

	"gorm.io/gorm"
)

type FineRepository struct {
	db *gorm.DB
}

func NewFineRepository(db *gorm.DB) *FineRepository {
	return &FineRepository{db: db}
}

// Create creates a new fine
func (r *FineRepository) Create(ctx context.Context, fine *models.Fine) error {
	return r.db.WithContext(ctx).Create(fine).Error
}

// GetByID retrieves a fine by ID
func (r *FineRepository) GetByID(ctx context.Context, id uint) (*models.Fine, error) {
	var fine models.Fine
	err := r.db.WithContext(ctx).Preload("User").Preload("Borrow").Preload("Borrow.Book").First(&fine, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("fine not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get fine: %w", err)
	}
	return &fine, nil
}

// GetByUserID retrieves all fines for a specific user
func (r *FineRepository) GetByUserID(ctx context.Context, userID uint) ([]*models.Fine, error) {
	var fines []*models.Fine
	err := r.db.WithContext(ctx).Preload("Borrow").Preload("Borrow.Book").Where("user_id = ?", userID).Find(&fines).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get user fines: %w", err)
	}
	return fines, nil
}

// GetUnpaidByUserID retrieves unpaid fines for a specific user
func (r *FineRepository) GetUnpaidByUserID(ctx context.Context, userID uint) ([]*models.Fine, error) {
	var fines []*models.Fine
	err := r.db.WithContext(ctx).Preload("Borrow").Preload("Borrow.Book").
		Where("user_id = ? AND is_paid = ?", userID, false).
		Find(&fines).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get unpaid user fines: %w", err)
	}
	return fines, nil
}

// GetByBorrowID retrieves fine for a specific borrow
func (r *FineRepository) GetByBorrowID(ctx context.Context, borrowID uint) (*models.Fine, error) {
	var fine models.Fine
	err := r.db.WithContext(ctx).Preload("User").Preload("Borrow").Preload("Borrow.Book").
		Where("borrow_id = ?", borrowID).First(&fine).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // No fine found for this borrow
		}
		return nil, fmt.Errorf("failed to get fine by borrow ID: %w", err)
	}
	return &fine, nil
}

// Update updates an existing fine
func (r *FineRepository) Update(ctx context.Context, fine *models.Fine) error {
	return r.db.WithContext(ctx).Save(fine).Error
}

// Delete soft deletes a fine
func (r *FineRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Fine{}, id).Error
}

// PayFine marks a fine as paid
func (r *FineRepository) PayFine(ctx context.Context, id uint) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&models.Fine{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_paid":    true,
			"paid_at":    &now,
			"updated_at": now,
		}).Error
}

// List retrieves fines with pagination and filtering
func (r *FineRepository) List(ctx context.Context, page, limit int, search string, isPaid *bool, userID *uint) ([]*models.Fine, int64, error) {
	var fines []*models.Fine
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Fine{}).
		Preload("User").Preload("Borrow").Preload("Borrow.Book")

	// Apply filters
	if search != "" {
		query = query.Joins("JOIN users ON users.id = fines.user_id").
			Joins("JOIN borrows ON borrows.id = fines.borrow_id").
			Joins("JOIN books ON books.id = borrows.book_id").
			Where("users.email ILIKE ? OR users.first_name ILIKE ? OR users.last_name ILIKE ? OR books.title ILIKE ? OR fines.reason ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if isPaid != nil {
		query = query.Where("is_paid = ?", *isPaid)
	}

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count fines: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&fines).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list fines: %w", err)
	}

	return fines, total, nil
}

// GetUserFineTotal gets the total amount of unpaid fines for a user
func (r *FineRepository) GetUserFineTotal(ctx context.Context, userID uint) (float64, error) {
	var total float64
	err := r.db.WithContext(ctx).Model(&models.Fine{}).
		Select("COALESCE(SUM(amount), 0)").
		Where("user_id = ? AND is_paid = ?", userID, false).
		Scan(&total).Error
	if err != nil {
		return 0, fmt.Errorf("failed to calculate user fine total: %w", err)
	}
	return total, nil
}

// CreateOverdueFines creates fines for overdue books
func (r *FineRepository) CreateOverdueFines(ctx context.Context, fineAmount float64) error {
	// Get all overdue borrows that don't have fines yet
	var overdueBorrows []models.Borrow
	err := r.db.WithContext(ctx).
		Where("due_date < ? AND returned_at IS NULL", time.Now()).
		Where("id NOT IN (SELECT borrow_id FROM fines WHERE deleted_at IS NULL)").
		Find(&overdueBorrows).Error
	if err != nil {
		return fmt.Errorf("failed to find overdue borrows: %w", err)
	}

	// Create fines for each overdue borrow
	for _, borrow := range overdueBorrows {
		daysOverdue := int(time.Since(borrow.DueDate).Hours() / 24)
		amount := float64(daysOverdue) * fineAmount

		fine := &models.Fine{
			UserID:   borrow.UserID,
			BorrowID: borrow.ID,
			Amount:   amount,
			Reason:   fmt.Sprintf("Overdue book fine - %d days late", daysOverdue),
			IsPaid:   false,
		}

		if err := r.Create(ctx, fine); err != nil {
			return fmt.Errorf("failed to create fine for borrow %d: %w", borrow.ID, err)
		}
	}

	return nil
}

// GetFineStats gets statistics about fines in a single query.
func (r *FineRepository) GetFineStats(ctx context.Context) (map[string]interface{}, error) {
	type row struct {
		Total        int64   `gorm:"column:total"`
		Paid         int64   `gorm:"column:paid"`
		Unpaid       int64   `gorm:"column:unpaid"`
		TotalAmount  float64 `gorm:"column:total_amount"`
		PaidAmount   float64 `gorm:"column:paid_amount"`
		UnpaidAmount float64 `gorm:"column:unpaid_amount"`
	}
	var res row
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*)                                                      AS total,
			COUNT(*) FILTER (WHERE is_paid = true)                        AS paid,
			COUNT(*) FILTER (WHERE is_paid = false)                       AS unpaid,
			COALESCE(SUM(amount), 0)                                      AS total_amount,
			COALESCE(SUM(amount) FILTER (WHERE is_paid = true),  0)       AS paid_amount,
			COALESCE(SUM(amount) FILTER (WHERE is_paid = false), 0)       AS unpaid_amount
		FROM fines WHERE deleted_at IS NULL
	`).Scan(&res).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get fine stats: %w", err)
	}
	return map[string]interface{}{
		"totalFines":   res.Total,
		"paidFines":    res.Paid,
		"unpaidFines":  res.Unpaid,
		"totalAmount":  res.TotalAmount,
		"paidAmount":   res.PaidAmount,
		"unpaidAmount": res.UnpaidAmount,
	}, nil
}

// GetTopDefaulters gets users with highest unpaid fine amounts
func (r *FineRepository) GetTopDefaulters(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	err := r.db.WithContext(ctx).
		Table("fines").
		Select("users.id, users.first_name, users.last_name, users.email, SUM(fines.amount) as total_unpaid").
		Joins("JOIN users ON users.id = fines.user_id").
		Where("fines.is_paid = ? AND fines.deleted_at IS NULL", false).
		Group("users.id, users.first_name, users.last_name, users.email").
		Order("total_unpaid DESC").
		Limit(limit).
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get top defaulters: %w", err)
	}

	return results, nil
}

// CheckUserHasFine checks if a user has any unpaid fines
func (r *FineRepository) CheckUserHasFine(ctx context.Context, userID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Fine{}).
		Where("user_id = ? AND is_paid = ?", userID, false).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("failed to check user fines: %w", err)
	}
	return count > 0, nil
}

// GetMostRecentFine gets the most recent fine for a user
func (r *FineRepository) GetMostRecentFine(ctx context.Context, userID uint) (*models.Fine, error) {
	var fine models.Fine
	err := r.db.WithContext(ctx).Preload("Borrow").Preload("Borrow.Book").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&fine).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get most recent fine: %w", err)
	}
	return &fine, nil
}


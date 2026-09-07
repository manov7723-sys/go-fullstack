package repository

import (
	"context"
	"fmt"
	"time"

	"library-management-system-backend/internal/models"

	"gorm.io/gorm"
)

type BorrowRepository struct {
	db *gorm.DB
}

func NewBorrowRepository(db *gorm.DB) *BorrowRepository {
	return &BorrowRepository{db: db}
}

// Create creates a new borrow
func (r *BorrowRepository) Create(ctx context.Context, borrow *models.Borrow) error {
	return r.db.WithContext(ctx).Create(borrow).Error
}

// GetByID retrieves a borrow by ID
func (r *BorrowRepository) GetByID(ctx context.Context, id uint) (*models.Borrow, error) {
	var borrow models.Borrow
	err := r.db.WithContext(ctx).Preload("User").Preload("Book").First(&borrow, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("borrow not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get borrow: %w", err)
	}
	return &borrow, nil
}

// Update updates a borrow
func (r *BorrowRepository) Update(ctx context.Context, borrow *models.Borrow) error {
	return r.db.WithContext(ctx).Save(borrow).Error
}

// Delete deletes a borrow (soft delete)
func (r *BorrowRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Borrow{}, id).Error
}

// List retrieves borrows with pagination and filtering
func (r *BorrowRepository) List(ctx context.Context, page, limit int, search, status string, userID *uint) ([]models.Borrow, int64, error) {
	var borrows []models.Borrow
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Borrow{}).Preload("User").Preload("Book")

	// Apply search filter
	if search != "" {
		query = query.Joins("JOIN books ON borrows.book_id = books.id").
			Joins("JOIN users ON borrows.user_id = users.id").
			Where("books.title ILIKE ? OR books.author ILIKE ? OR users.first_name ILIKE ? OR users.last_name ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Apply status filter
	if status != "" {
		switch status {
		case "borrowed":
			query = query.Where("borrows.returned_at IS NULL AND borrows.due_date >= ?", time.Now())
		case "returned":
			query = query.Where("borrows.returned_at IS NOT NULL")
		case "overdue":
			query = query.Where("borrows.returned_at IS NULL AND borrows.due_date < ?", time.Now())
		}
	}

	// Apply user filter
	if userID != nil {
		query = query.Where("borrows.user_id = ?", *userID)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count borrows: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("borrows.created_at DESC").Find(&borrows).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list borrows: %w", err)
	}

	return borrows, total, nil
}

// GetByUserID retrieves borrows for a specific user
func (r *BorrowRepository) GetByUserID(ctx context.Context, userID uint) ([]models.Borrow, error) {
	var borrows []models.Borrow
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Preload("Book").Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get borrows by user ID: %w", err)
	}
	return borrows, nil
}

// GetByBookID retrieves borrows for a specific book
func (r *BorrowRepository) GetByBookID(ctx context.Context, bookID uint) ([]models.Borrow, error) {
	var borrows []models.Borrow
	err := r.db.WithContext(ctx).Where("book_id = ?", bookID).Preload("User").Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get borrows by book ID: %w", err)
	}
	return borrows, nil
}

// GetActiveBorrows retrieves all active borrows
func (r *BorrowRepository) GetActiveBorrows(ctx context.Context) ([]models.Borrow, error) {
	var borrows []models.Borrow
	err := r.db.WithContext(ctx).Where("returned_at IS NULL").Preload("User").Preload("Book").Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get active borrows: %w", err)
	}
	return borrows, nil
}

// GetOverdueBorrows retrieves all overdue borrows
func (r *BorrowRepository) GetOverdueBorrows(ctx context.Context) ([]models.Borrow, error) {
	var borrows []models.Borrow
	err := r.db.WithContext(ctx).Where("returned_at IS NULL AND due_date < ?", time.Now()).Preload("User").Preload("Book").Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get overdue borrows: %w", err)
	}
	return borrows, nil
}

// ReturnBook marks a book as returned
func (r *BorrowRepository) ReturnBook(ctx context.Context, borrowID uint) error {
	now := time.Now()
	err := r.db.WithContext(ctx).Model(&models.Borrow{}).Where("id = ?", borrowID).Updates(map[string]interface{}{
		"returned_at": now,
		"status":      "returned",
	}).Error
	if err != nil {
		return fmt.Errorf("failed to return book: %w", err)
	}
	return nil
}

// ExtendBorrow extends the due date of a borrow
func (r *BorrowRepository) ExtendBorrow(ctx context.Context, borrowID uint, newDueDate time.Time) error {
	err := r.db.WithContext(ctx).Model(&models.Borrow{}).Where("id = ?", borrowID).Update("due_date", newDueDate).Error
	if err != nil {
		return fmt.Errorf("failed to extend borrow: %w", err)
	}
	return nil
}

// GetBorrowStats retrieves statistics for borrows in a single query.
func (r *BorrowRepository) GetBorrowStats(ctx context.Context) (map[string]interface{}, error) {
	type row struct {
		Total    int64 `gorm:"column:total"`
		Active   int64 `gorm:"column:active"`
		Overdue  int64 `gorm:"column:overdue"`
		Returned int64 `gorm:"column:returned"`
	}
	var res row
	now := time.Now()
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE returned_at IS NULL AND due_date >= ?) AS active,
			COUNT(*) FILTER (WHERE returned_at IS NULL AND due_date < ?)  AS overdue,
			COUNT(*) FILTER (WHERE returned_at IS NOT NULL)               AS returned
		FROM borrows WHERE deleted_at IS NULL
	`, now, now).Scan(&res).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get borrow stats: %w", err)
	}
	return map[string]interface{}{
		"totalBorrows":    res.Total,
		"activeBorrows":   res.Active,
		"overdueBorrows":  res.Overdue,
		"returnedBorrows": res.Returned,
	}, nil
}

// GetUserBorrowStats retrieves borrow statistics for a specific user in a single query.
func (r *BorrowRepository) GetUserBorrowStats(ctx context.Context, userID uint) (map[string]interface{}, error) {
	type row struct {
		Total   int64 `gorm:"column:total"`
		Active  int64 `gorm:"column:active"`
		Overdue int64 `gorm:"column:overdue"`
	}
	var res row
	now := time.Now()
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE returned_at IS NULL AND due_date >= ?) AS active,
			COUNT(*) FILTER (WHERE returned_at IS NULL AND due_date < ?)  AS overdue
		FROM borrows WHERE user_id = ? AND deleted_at IS NULL
	`, now, now, userID).Scan(&res).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get user borrow stats: %w", err)
	}
	return map[string]interface{}{
		"totalBorrows":   res.Total,
		"activeBorrows":  res.Active,
		"overdueBorrows": res.Overdue,
	}, nil
}

// GetActiveByUserID retrieves active borrows for a specific user
func (r *BorrowRepository) GetActiveByUserID(ctx context.Context, userID uint) ([]*models.Borrow, error) {
	var borrows []*models.Borrow
	err := r.db.WithContext(ctx).Preload("Book").
		Where("user_id = ? AND returned_at IS NULL", userID).
		Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get active user borrows: %w", err)
	}
	return borrows, nil
}

// GetOverdueByUserID retrieves overdue borrows for a specific user
func (r *BorrowRepository) GetOverdueByUserID(ctx context.Context, userID uint) ([]*models.Borrow, error) {
	var borrows []*models.Borrow
	err := r.db.WithContext(ctx).Preload("Book").
		Where("user_id = ? AND returned_at IS NULL AND due_date < ?", userID, time.Now()).
		Find(&borrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get overdue user borrows: %w", err)
	}
	return borrows, nil
}

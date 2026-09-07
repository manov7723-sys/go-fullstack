package repository

import (
	"context"
	"fmt"
	"time"

	"library-management-system-backend/internal/models"

	"gorm.io/gorm"
)

type ReservationRepository struct {
	db *gorm.DB
}

func NewReservationRepository(db *gorm.DB) *ReservationRepository {
	return &ReservationRepository{db: db}
}

// Create creates a new reservation
func (r *ReservationRepository) Create(ctx context.Context, reservation *models.Reservation) error {
	return r.db.WithContext(ctx).Create(reservation).Error
}

// GetByID retrieves a reservation by ID
func (r *ReservationRepository) GetByID(ctx context.Context, id uint) (*models.Reservation, error) {
	var reservation models.Reservation
	err := r.db.WithContext(ctx).Preload("User").Preload("Book").First(&reservation, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("reservation not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get reservation: %w", err)
	}
	return &reservation, nil
}

// GetByUserID retrieves all reservations for a specific user
func (r *ReservationRepository) GetByUserID(ctx context.Context, userID uint) ([]*models.Reservation, error) {
	var reservations []*models.Reservation
	err := r.db.WithContext(ctx).Preload("Book").Where("user_id = ?", userID).Find(&reservations).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get user reservations: %w", err)
	}
	return reservations, nil
}

// GetActiveByUserID retrieves active reservations for a specific user
func (r *ReservationRepository) GetActiveByUserID(ctx context.Context, userID uint) ([]*models.Reservation, error) {
	var reservations []*models.Reservation
	err := r.db.WithContext(ctx).Preload("Book").
		Where("user_id = ? AND status = ? AND expires_at > ?", userID, "active", time.Now()).
		Find(&reservations).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get active user reservations: %w", err)
	}
	return reservations, nil
}

// GetByBookID retrieves all reservations for a specific book
func (r *ReservationRepository) GetByBookID(ctx context.Context, bookID uint) ([]*models.Reservation, error) {
	var reservations []*models.Reservation
	err := r.db.WithContext(ctx).Preload("User").Where("book_id = ?", bookID).Find(&reservations).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get book reservations: %w", err)
	}
	return reservations, nil
}

// GetActiveByBookID retrieves active reservations for a specific book
func (r *ReservationRepository) GetActiveByBookID(ctx context.Context, bookID uint) ([]*models.Reservation, error) {
	var reservations []*models.Reservation
	err := r.db.WithContext(ctx).Preload("User").
		Where("book_id = ? AND status = ? AND expires_at > ?", bookID, "active", time.Now()).
		Find(&reservations).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get active book reservations: %w", err)
	}
	return reservations, nil
}

// Update updates an existing reservation
func (r *ReservationRepository) Update(ctx context.Context, reservation *models.Reservation) error {
	return r.db.WithContext(ctx).Save(reservation).Error
}

// Delete soft deletes a reservation
func (r *ReservationRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Reservation{}, id).Error
}

// Cancel cancels a reservation (sets status to cancelled)
func (r *ReservationRepository) Cancel(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.Reservation{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     "cancelled",
			"updated_at": time.Now(),
		}).Error
}

// Fulfill fulfills a reservation (sets status to fulfilled)
func (r *ReservationRepository) Fulfill(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.Reservation{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     "fulfilled",
			"updated_at": time.Now(),
		}).Error
}

// ExpireReservations marks expired reservations
func (r *ReservationRepository) ExpireReservations(ctx context.Context) error {
	return r.db.WithContext(ctx).Model(&models.Reservation{}).
		Where("status = ? AND expires_at < ?", "active", time.Now()).
		Updates(map[string]interface{}{
			"status":     "expired",
			"updated_at": time.Now(),
		}).Error
}

// List retrieves reservations with pagination and filtering
func (r *ReservationRepository) List(ctx context.Context, page, limit int, search, status string, userID *uint) ([]*models.Reservation, int64, error) {
	var reservations []*models.Reservation
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Reservation{}).Preload("User").Preload("Book")

	// Apply filters
	if search != "" {
		query = query.Joins("JOIN users ON users.id = reservations.user_id").
			Joins("JOIN books ON books.id = reservations.book_id").
			Where("users.email ILIKE ? OR users.first_name ILIKE ? OR users.last_name ILIKE ? OR books.title ILIKE ? OR books.author ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count reservations: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&reservations).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list reservations: %w", err)
	}

	return reservations, total, nil
}

// GetUserReservationCount gets the count of active reservations for a user
func (r *ReservationRepository) GetUserReservationCount(ctx context.Context, userID uint) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Reservation{}).
		Where("user_id = ? AND status = ? AND expires_at > ?", userID, "active", time.Now()).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count user reservations: %w", err)
	}
	return count, nil
}

// CheckUserHasReservation checks if a user has an active reservation for a book
func (r *ReservationRepository) CheckUserHasReservation(ctx context.Context, userID, bookID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Reservation{}).
		Where("user_id = ? AND book_id = ? AND status = ? AND expires_at > ?", userID, bookID, "active", time.Now()).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("failed to check user reservation: %w", err)
	}
	return count > 0, nil
}

// GetNextReservation gets the next reservation in queue for a book
func (r *ReservationRepository) GetNextReservation(ctx context.Context, bookID uint) (*models.Reservation, error) {
	var reservation models.Reservation
	err := r.db.WithContext(ctx).Preload("User").
		Where("book_id = ? AND status = ? AND expires_at > ?", bookID, "active", time.Now()).
		Order("reservation_date ASC").
		First(&reservation).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // No reservations found
		}
		return nil, fmt.Errorf("failed to get next reservation: %w", err)
	}
	return &reservation, nil
}

// GetReservationStats gets statistics about reservations in a single query.
func (r *ReservationRepository) GetReservationStats(ctx context.Context) (map[string]interface{}, error) {
	type row struct {
		Total     int64 `gorm:"column:total"`
		Active    int64 `gorm:"column:active"`
		Fulfilled int64 `gorm:"column:fulfilled"`
		Expired   int64 `gorm:"column:expired"`
	}
	var res row
	now := time.Now()
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'active' AND expires_at > ?)    AS active,
			COUNT(*) FILTER (WHERE status = 'fulfilled')                     AS fulfilled,
			COUNT(*) FILTER (WHERE status = 'expired' OR expires_at < ?)    AS expired
		FROM reservations WHERE deleted_at IS NULL
	`, now, now).Scan(&res).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get reservation stats: %w", err)
	}
	return map[string]interface{}{
		"totalReservations":     res.Total,
		"activeReservations":    res.Active,
		"fulfilledReservations": res.Fulfilled,
		"expiredReservations":   res.Expired,
	}, nil
}

// CancelReservation cancels a reservation by setting its status to cancelled
func (r *ReservationRepository) CancelReservation(ctx context.Context, id uint) error {
	err := r.db.WithContext(ctx).Model(&models.Reservation{}).
		Where("id = ?", id).
		Update("status", "cancelled").Error
	if err != nil {
		return fmt.Errorf("failed to cancel reservation: %w", err)
	}
	return nil
}

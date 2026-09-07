package models

import (
	"time"

	"gorm.io/gorm"
)

type Reservation struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	UserID          uint           `json:"userId" gorm:"not null;index;index:idx_res_user_status,priority:1"`
	BookID          uint           `json:"bookId" gorm:"not null;index"`
	ReservationDate time.Time      `json:"reservationDate" gorm:"not null"`
	ExpiresAt       time.Time      `json:"expiresAt" gorm:"not null;index:idx_res_status_exp,priority:2"`
	Status          string         `json:"status" gorm:"default:'active';index;index:idx_res_user_status,priority:2;index:idx_res_status_exp,priority:1;check:status IN ('active', 'fulfilled', 'expired')"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Book Book `json:"book,omitempty" gorm:"foreignKey:BookID"`
}

type ReservationCreateRequest struct {
	BookID uint `json:"bookId" validate:"required"`
}

type ReservationResponse struct {
	ID             uint       `json:"id"`
	UserID         uint       `json:"userId"`
	BookID         uint       `json:"bookId"`
	ReservationDate time.Time `json:"reservationDate"`
	ExpiresAt      time.Time  `json:"expiresAt"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`

	// Related data
	User UserResponse `json:"user,omitempty"`
	Book BookResponse `json:"book,omitempty"`
}

type ReservationSearchRequest struct {
	Page     int    `json:"page" validate:"omitempty,min=1"`
	Limit    int    `json:"limit" validate:"omitempty,min=1,max=100"`
	UserID   uint   `json:"userId" validate:"omitempty"`
	BookID   uint   `json:"bookId" validate:"omitempty"`
	Status   string `json:"status" validate:"omitempty,oneof=active fulfilled expired"`
	Sort     string `json:"sort" validate:"omitempty,oneof=reservation_date expires_at created_at"`
	Order    string `json:"order" validate:"omitempty,oneof=asc desc"`
}

type ReservationSearchResponse struct {
	Reservations []ReservationResponse `json:"reservations"`
	Pagination   Pagination           `json:"pagination"`
}

func (r *Reservation) ToResponse() ReservationResponse {
	return ReservationResponse{
		ID:             r.ID,
		UserID:         r.UserID,
		BookID:         r.BookID,
		ReservationDate: r.ReservationDate,
		ExpiresAt:      r.ExpiresAt,
		Status:         r.Status,
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
		User:           r.User.ToResponse(),
		Book:           r.Book.ToResponse(),
	}
}

func (r *Reservation) IsActive() bool {
	return r.Status == "active" && time.Now().Before(r.ExpiresAt)
}

func (r *Reservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

func (r *Reservation) IsFulfilled() bool {
	return r.Status == "fulfilled"
}

func (r *Reservation) MarkAsFulfilled() {
	r.Status = "fulfilled"
}

func (r *Reservation) MarkAsExpired() {
	if r.IsExpired() {
		r.Status = "expired"
	}
}

func (r *Reservation) GetDaysUntilExpiry() int {
	if r.IsExpired() {
		return 0
	}
	days := int(time.Until(r.ExpiresAt).Hours() / 24)
	if days < 0 {
		return 0
	}
	return days
}

func (r *Reservation) GetDaysSinceReservation() int {
	return int(time.Since(r.ReservationDate).Hours() / 24)
}

// Default expiration time for reservations (7 days)
const ReservationExpirationDays = 7

func CalculateExpiryDate(reservationDate time.Time) time.Time {
	return reservationDate.AddDate(0, 0, ReservationExpirationDays)
} 
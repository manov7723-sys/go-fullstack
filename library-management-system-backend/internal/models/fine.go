package models

import (
	"time"

	"gorm.io/gorm"
)

type Fine struct {
	ID       uint           `json:"id" gorm:"primaryKey"`
	UserID   uint           `json:"userId" gorm:"not null;index;index:idx_fine_user_paid,priority:1"`
	BorrowID uint           `json:"borrowId" gorm:"not null;index"`
	Amount   float64        `json:"amount" gorm:"not null"`
	Reason   string         `json:"reason" gorm:"not null"`
	DueDate  time.Time      `json:"dueDate" gorm:"not null"`
	IsPaid   bool           `json:"isPaid" gorm:"default:false;index;index:idx_fine_user_paid,priority:2"`
	PaidAt    *time.Time     `json:"paidAt"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	User   User   `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Borrow Borrow `json:"borrow,omitempty" gorm:"foreignKey:BorrowID"`
}

type FineCreateRequest struct {
	BorrowID uint    `json:"borrowId" validate:"required"`
	Amount   float64 `json:"amount" validate:"required,gt=0"`
	Reason   string  `json:"reason" validate:"required,min=1,max=255"`
}

type FinePaymentRequest struct {
	FineID uint `json:"fineId" validate:"required"`
}

type FineResponse struct {
	ID        uint       `json:"id"`
	UserID    uint       `json:"userId"`
	BorrowID  uint       `json:"borrowId"`
	Amount    float64    `json:"amount"`
	Reason    string     `json:"reason"`
	IsPaid    bool       `json:"isPaid"`
	PaidAt    *time.Time `json:"paidAt"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	// Related data
	User   UserResponse   `json:"user,omitempty"`
	Borrow BorrowResponse `json:"borrow,omitempty"`
}

type FineSearchRequest struct {
	Page     int    `json:"page" validate:"omitempty,min=1"`
	Limit    int    `json:"limit" validate:"omitempty,min=1,max=100"`
	UserID   uint   `json:"userId" validate:"omitempty"`
	BorrowID uint   `json:"borrowId" validate:"omitempty"`
	IsPaid   *bool  `json:"isPaid" validate:"omitempty"`
	Sort     string `json:"sort" validate:"omitempty,oneof=amount created_at paid_at"`
	Order    string `json:"order" validate:"omitempty,oneof=asc desc"`
}

type FineSearchResponse struct {
	Fines      []FineResponse `json:"fines"`
	Pagination Pagination     `json:"pagination"`
}

type FineSummary struct {
	TotalFines       float64 `json:"totalFines"`
	PaidFines        float64 `json:"paidFines"`
	UnpaidFines      float64 `json:"unpaidFines"`
	TotalFinesCount  int     `json:"totalFinesCount"`
	PaidFinesCount   int     `json:"paidFinesCount"`
	UnpaidFinesCount int     `json:"unpaidFinesCount"`
}

func (f *Fine) ToResponse() FineResponse {
	return FineResponse{
		ID:        f.ID,
		UserID:    f.UserID,
		BorrowID:  f.BorrowID,
		Amount:    f.Amount,
		Reason:    f.Reason,
		IsPaid:    f.IsPaid,
		PaidAt:    f.PaidAt,
		CreatedAt: f.CreatedAt,
		UpdatedAt: f.UpdatedAt,
		User:      f.User.ToResponse(),
		Borrow:    f.Borrow.ToResponse(),
	}
}

func (f *Fine) IsFullyPaid() bool {
	return f.IsPaid && f.PaidAt != nil
}

func (f *Fine) MarkAsPaid() {
	now := time.Now()
	f.IsPaid = true
	f.PaidAt = &now
}

func (f *Fine) GetDaysSinceCreated() int {
	return int(time.Since(f.CreatedAt).Hours() / 24)
}

func (f *Fine) GetDaysSincePaid() int {
	if !f.IsFullyPaid() {
		return 0
	}
	return int(time.Since(*f.PaidAt).Hours() / 24)
}

// Common fine reasons
const (
	FineReasonOverdue = "overdue"
	FineReasonDamaged = "damaged"
	FineReasonLost    = "lost"
)

// Fine calculation constants
const (
	DailyFineRate = 0.50 // $0.50 per day
	MaxFineAmount = 50.0 // Maximum fine of $50
)

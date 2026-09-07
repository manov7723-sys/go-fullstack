package models

import (
	"time"

	"gorm.io/gorm"
)

type Borrow struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	UserID     uint           `json:"userId" gorm:"not null;index;index:idx_borrow_user_status,priority:1"`
	BookID     uint           `json:"bookId" gorm:"not null;index"`
	BorrowedAt time.Time      `json:"borrowedAt" gorm:"default:CURRENT_TIMESTAMP"`
	DueDate    time.Time      `json:"dueDate" gorm:"not null;index:idx_borrow_status_due,priority:2"`
	ReturnedAt *time.Time     `json:"returnedAt"`
	FineAmount float64        `json:"fineAmount" gorm:"default:0"`
	Status     string         `json:"status" gorm:"default:'borrowed';index;index:idx_borrow_user_status,priority:2;index:idx_borrow_status_due,priority:1;check:status IN ('borrowed', 'returned', 'overdue')"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Book Book `json:"book,omitempty" gorm:"foreignKey:BookID"`
	Fines []Fine `json:"fines,omitempty" gorm:"foreignKey:BorrowID"`
}

type BorrowCreateRequest struct {
	BookID uint `json:"bookId" validate:"required"`
}

type BorrowReturnRequest struct {
	BorrowID uint `json:"borrowId" validate:"required"`
}

type BorrowResponse struct {
	ID          uint       `json:"id"`
	UserID      uint       `json:"userId"`
	BookID      uint       `json:"bookId"`
	BorrowedAt  time.Time  `json:"borrowedAt"`
	DueDate     time.Time  `json:"dueDate"`
	ReturnedAt  *time.Time `json:"returnedAt"`
	FineAmount  float64    `json:"fineAmount"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`

	// Related data
	User UserResponse `json:"user,omitempty"`
	Book BookResponse `json:"book,omitempty"`
}

type BorrowSearchRequest struct {
	Page     int    `json:"page" validate:"omitempty,min=1"`
	Limit    int    `json:"limit" validate:"omitempty,min=1,max=100"`
	UserID   uint   `json:"userId" validate:"omitempty"`
	BookID   uint   `json:"bookId" validate:"omitempty"`
	Status   string `json:"status" validate:"omitempty,oneof=borrowed returned overdue"`
	Sort     string `json:"sort" validate:"omitempty,oneof=borrowed_at due_date created_at"`
	Order    string `json:"order" validate:"omitempty,oneof=asc desc"`
}

type BorrowSearchResponse struct {
	Borrows    []BorrowResponse `json:"borrows"`
	Pagination Pagination       `json:"pagination"`
}

func (b *Borrow) ToResponse() BorrowResponse {
	return BorrowResponse{
		ID:         b.ID,
		UserID:     b.UserID,
		BookID:     b.BookID,
		BorrowedAt: b.BorrowedAt,
		DueDate:    b.DueDate,
		ReturnedAt: b.ReturnedAt,
		FineAmount: b.FineAmount,
		Status:     b.Status,
		CreatedAt:  b.CreatedAt,
		UpdatedAt:  b.UpdatedAt,
		User:       b.User.ToResponse(),
		Book:       b.Book.ToResponse(),
	}
}

func (b *Borrow) IsOverdue() bool {
	return time.Now().After(b.DueDate) && b.Status == "borrowed"
}

func (b *Borrow) IsReturned() bool {
	return b.Status == "returned" && b.ReturnedAt != nil
}

func (b *Borrow) IsActive() bool {
	return b.Status == "borrowed"
}

func (b *Borrow) CalculateFine() float64 {
	if b.IsReturned() || !b.IsOverdue() {
		return 0
	}

	daysOverdue := time.Since(b.DueDate).Hours() / 24
	dailyRate := 0.50 // $0.50 per day
	fine := daysOverdue * dailyRate

	if fine > 50.0 { // Maximum fine of $50
		fine = 50.0
	}

	return fine
}

func (b *Borrow) MarkAsReturned() {
	now := time.Now()
	b.ReturnedAt = &now
	b.Status = "returned"
	b.FineAmount = b.CalculateFine()
}

func (b *Borrow) MarkAsOverdue() {
	if b.IsOverdue() {
		b.Status = "overdue"
	}
}

func (b *Borrow) GetDaysOverdue() int {
	if !b.IsOverdue() {
		return 0
	}
	return int(time.Since(b.DueDate).Hours() / 24)
}

func (b *Borrow) GetDaysUntilDue() int {
	if b.IsReturned() {
		return 0
	}
	days := int(time.Until(b.DueDate).Hours() / 24)
	if days < 0 {
		return 0
	}
	return days
} 
package models

import (
	"time"

	"gorm.io/gorm"
)

type Book struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	Title          string         `json:"title" gorm:"not null;index"`
	Author         string         `json:"author" gorm:"not null;index"`
	ISBN           string         `json:"isbn" gorm:"uniqueIndex;not null"`
	Category       string         `json:"category" gorm:"not null;index"`
	PublishedDate  *time.Time     `json:"publishedDate"`
	Description    string         `json:"description"`
	TotalCopies    int            `json:"totalCopies" gorm:"default:1"`
	AvailableCopies int           `json:"availableCopies" gorm:"default:1"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Borrows      []Borrow      `json:"borrows,omitempty" gorm:"foreignKey:BookID"`
	Reservations []Reservation `json:"reservations,omitempty" gorm:"foreignKey:BookID"`
}

type BookCreateRequest struct {
	Title         string     `json:"title" validate:"required,min=1,max=255"`
	Author        string     `json:"author" validate:"required,min=1,max=255"`
	ISBN          string     `json:"isbn" validate:"required,min=10,max=20"`
	Category      string     `json:"category" validate:"required,min=1,max=100"`
	PublishedDate *time.Time `json:"publishedDate" validate:"omitempty"`
	Description   string     `json:"description" validate:"omitempty,max=1000"`
	Copies        int        `json:"copies" validate:"required,min=1,max=100"`
}

type BookUpdateRequest struct {
	Title         string     `json:"title" validate:"omitempty,min=1,max=255"`
	Author        string     `json:"author" validate:"omitempty,min=1,max=255"`
	ISBN          string     `json:"isbn" validate:"omitempty,min=10,max=20"`
	Category      string     `json:"category" validate:"omitempty,min=1,max=100"`
	PublishedDate *time.Time `json:"publishedDate" validate:"omitempty"`
	Description   string     `json:"description" validate:"omitempty,max=1000"`
	Copies        int        `json:"copies" validate:"omitempty,min=1,max=100"`
}

type BookResponse struct {
	ID             uint       `json:"id"`
	Title          string     `json:"title"`
	Author         string     `json:"author"`
	ISBN           string     `json:"isbn"`
	Category       string     `json:"category"`
	PublishedDate  *time.Time `json:"publishedDate"`
	Description    string     `json:"description"`
	TotalCopies    int        `json:"totalCopies"`
	AvailableCopies int       `json:"availableCopies"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type BookSearchRequest struct {
	Page     int    `json:"page" validate:"omitempty,min=1"`
	Limit    int    `json:"limit" validate:"omitempty,min=1,max=100"`
	Search   string `json:"search" validate:"omitempty"`
	Category string `json:"category" validate:"omitempty"`
	Status   string `json:"status" validate:"omitempty,oneof=available borrowed reserved"`
	Sort     string `json:"sort" validate:"omitempty,oneof=title author published_date created_at"`
	Order    string `json:"order" validate:"omitempty,oneof=asc desc"`
}

type BookSearchResponse struct {
	Books      []BookResponse `json:"books"`
	Pagination Pagination     `json:"pagination"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
	Pages int `json:"pages"`
}

func (b *Book) ToResponse() BookResponse {
	status := "available"
	if b.AvailableCopies == 0 {
		status = "borrowed"
	}

	return BookResponse{
		ID:             b.ID,
		Title:          b.Title,
		Author:         b.Author,
		ISBN:           b.ISBN,
		Category:       b.Category,
		PublishedDate:  b.PublishedDate,	
		Description:    b.Description,
		TotalCopies:    b.TotalCopies,
		AvailableCopies: b.AvailableCopies,
		Status:         status,
		CreatedAt:      b.CreatedAt,
		UpdatedAt:      b.UpdatedAt,
	}
}

func (b *Book) IsAvailable() bool {
	return b.AvailableCopies > 0
}

func (b *Book) CanBeBorrowed() bool {
	return b.IsAvailable() && b.TotalCopies > 0
}

func (b *Book) DecrementAvailableCopies() {
	if b.AvailableCopies > 0 {
		b.AvailableCopies--
	}
}

func (b *Book) IncrementAvailableCopies() {
	if b.AvailableCopies < b.TotalCopies {
		b.AvailableCopies++
	}
}

func (b *Book) GetAvailabilityPercentage() float64 {
	if b.TotalCopies == 0 {
		return 0
	}
	return float64(b.AvailableCopies) / float64(b.TotalCopies) * 100
} 
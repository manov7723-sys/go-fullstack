package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Email         string         `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash  string         `json:"-" gorm:"not null"`
	FirstName     string         `json:"firstName" gorm:"not null"`
	LastName      string         `json:"lastName" gorm:"not null"`
	Phone         string         `json:"phone"`
	Role          string         `json:"role" gorm:"default:'user';check:role IN ('user', 'admin', 'librarian')"`
	IsActive      bool           `json:"isActive" gorm:"default:true"`
	EmailVerified bool           `json:"emailVerified" gorm:"default:false"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Borrows      []Borrow      `json:"borrows,omitempty" gorm:"foreignKey:UserID"`
	Reservations []Reservation `json:"reservations,omitempty" gorm:"foreignKey:UserID"`
	Fines        []Fine        `json:"fines,omitempty" gorm:"foreignKey:UserID"`
}

type UserCreateRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	FirstName string `json:"firstName" validate:"required,min=2,max=100"`
	LastName  string `json:"lastName" validate:"required,min=2,max=100"`
	Phone     string `json:"phone" validate:"omitempty"`
}

type UserUpdateRequest struct {
	FirstName string `json:"firstName" validate:"omitempty,min=2,max=100"`
	LastName  string `json:"lastName" validate:"omitempty,min=2,max=100"`
	Phone     string `json:"phone" validate:"omitempty"`
}

type UserLoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type UserResponse struct {
	ID            uint      `json:"id"`
	Email         string    `json:"email"`
	FirstName     string    `json:"firstName"`
	LastName      string    `json:"lastName"`
	Phone         string    `json:"phone"`
	Role          string    `json:"role"`
	IsActive      bool      `json:"isActive"`
	EmailVerified bool      `json:"emailVerified"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type UserWithTokenResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:            u.ID,
		Email:         u.Email,
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		Phone:         u.Phone,
		Role:          u.Role,
		IsActive:      u.IsActive,
		EmailVerified: u.EmailVerified,
		CreatedAt:     u.CreatedAt,
		UpdatedAt:     u.UpdatedAt,
	}
}

func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}

func (u *User) IsLibrarian() bool {
	return u.Role == "librarian"
}

func (u *User) IsAdminOrLibrarian() bool {
	return u.IsAdmin() || u.IsLibrarian()
}

func (u *User) GetFullName() string {
	return u.FirstName + " " + u.LastName
}

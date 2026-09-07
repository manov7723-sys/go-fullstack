package models

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	UserID   uint   `json:"userId" gorm:"not null;index;index:idx_notif_user_read,priority:1"`
	Title    string `json:"title" gorm:"not null;size:255"`
	Message  string `json:"message" gorm:"not null;type:text"`
	Type     string `json:"type" gorm:"not null;check:type IN ('info', 'warning', 'error', 'success')"`
	Category string `json:"category" gorm:"not null;check:category IN ('borrow', 'reservation', 'fine', 'book', 'system')"`
	IsRead   bool   `json:"isRead" gorm:"default:false;index;index:idx_notif_user_read,priority:2"`
	EntityID   *uint          `json:"entityId,omitempty" gorm:"index"`
	EntityType string         `json:"entityType,omitempty" gorm:"size:50"`
	ActionURL  string         `json:"actionUrl,omitempty" gorm:"size:255"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type NotificationCreateRequest struct {
	UserID     uint   `json:"userId" validate:"required"`
	Title      string `json:"title" validate:"required,min=1,max=255"`
	Message    string `json:"message" validate:"required,min=1"`
	Type       string `json:"type" validate:"required,oneof=info warning error success"`
	Category   string `json:"category" validate:"required,oneof=borrow reservation fine book system"`
	EntityID   *uint  `json:"entityId,omitempty"`
	EntityType string `json:"entityType,omitempty" validate:"max=50"`
	ActionURL  string `json:"actionUrl,omitempty" validate:"max=255"`
}

type NotificationResponse struct {
	ID         uint      `json:"id"`
	UserID     uint      `json:"userId"`
	Title      string    `json:"title"`
	Message    string    `json:"message"`
	Type       string    `json:"type"`
	Category   string    `json:"category"`
	IsRead     bool      `json:"isRead"`
	EntityID   *uint     `json:"entityId,omitempty"`
	EntityType string    `json:"entityType,omitempty"`
	ActionURL  string    `json:"actionUrl,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type NotificationSearchRequest struct {
	Page     int    `json:"page" validate:"min=1"`
	Limit    int    `json:"limit" validate:"min=1,max=100"`
	IsRead   *bool  `json:"isRead,omitempty"`
	Category string `json:"category,omitempty" validate:"omitempty,oneof=borrow reservation fine book system"`
	Type     string `json:"type,omitempty" validate:"omitempty,oneof=info warning error success"`
}

type NotificationSearchResponse struct {
	Notifications []*NotificationResponse `json:"notifications"`
	Total         int64                   `json:"total"`
	Page          int                     `json:"page"`
	Pages         int                     `json:"pages"`
	Limit         int                     `json:"limit"`
	UnreadCount   int64                   `json:"unreadCount"`
}

// ToResponse converts Notification to NotificationResponse
func (n *Notification) ToResponse() NotificationResponse {
	return NotificationResponse{
		ID:         n.ID,
		UserID:     n.UserID,
		Title:      n.Title,
		Message:    n.Message,
		Type:       n.Type,
		Category:   n.Category,
		IsRead:     n.IsRead,
		EntityID:   n.EntityID,
		EntityType: n.EntityType,
		ActionURL:  n.ActionURL,
		CreatedAt:  n.CreatedAt,
		UpdatedAt:  n.UpdatedAt,
	}
}

// TableName returns the table name for the Notification model
func (Notification) TableName() string {
	return "notifications"
}


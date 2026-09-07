package repository

import (
	"context"
	"fmt"
	"time"

	"library-management-system-backend/internal/models"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// Create creates a new notification
func (r *NotificationRepository) Create(ctx context.Context, notification *models.Notification) error {
	return r.db.WithContext(ctx).Create(notification).Error
}

// GetByID retrieves a notification by ID
func (r *NotificationRepository) GetByID(ctx context.Context, id uint) (*models.Notification, error) {
	var notification models.Notification
	err := r.db.WithContext(ctx).Preload("User").First(&notification, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("notification not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}
	return &notification, nil
}

// GetByUserID retrieves all notifications for a specific user
func (r *NotificationRepository) GetByUserID(ctx context.Context, userID uint, limit, offset int) ([]*models.Notification, error) {
	var notifications []*models.Notification
	query := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Find(&notifications).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get user notifications: %w", err)
	}
	return notifications, nil
}

// GetUnreadByUserID retrieves unread notifications for a specific user
func (r *NotificationRepository) GetUnreadByUserID(ctx context.Context, userID uint, limit, offset int) ([]*models.Notification, error) {
	var notifications []*models.Notification
	query := r.db.WithContext(ctx).Where("user_id = ? AND is_read = ?", userID, false).Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Find(&notifications).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get unread user notifications: %w", err)
	}
	return notifications, nil
}

// Update updates an existing notification
func (r *NotificationRepository) Update(ctx context.Context, notification *models.Notification) error {
	return r.db.WithContext(ctx).Save(notification).Error
}

// Delete soft deletes a notification
func (r *NotificationRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Notification{}, id).Error
}

// MarkAsRead marks a notification as read
func (r *NotificationRepository) MarkAsRead(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_read":    true,
			"updated_at": time.Now(),
		}).Error
}

// MarkAllAsRead marks all notifications for a user as read
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID uint) error {
	return r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read":    true,
			"updated_at": time.Now(),
		}).Error
}

// GetUnreadCount gets the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCount(ctx context.Context, userID uint) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	return count, nil
}

// List retrieves notifications with pagination and filtering
func (r *NotificationRepository) List(ctx context.Context, userID uint, page, limit int, isRead *bool, category, notificationType string) ([]*models.Notification, int64, error) {
	var notifications []*models.Notification
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Notification{}).Where("user_id = ?", userID)

	// Apply filters
	if isRead != nil {
		query = query.Where("is_read = ?", *isRead)
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if notificationType != "" {
		query = query.Where("type = ?", notificationType)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&notifications).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list notifications: %w", err)
	}

	return notifications, total, nil
}

// CreateBookReturnReminder creates a book return reminder notification
func (r *NotificationRepository) CreateBookReturnReminder(ctx context.Context, userID, borrowID uint, bookTitle string, dueDate time.Time) error {
	daysUntilDue := int(time.Until(dueDate).Hours() / 24)

	var message string
	var notificationType string

	if daysUntilDue <= 0 {
		message = fmt.Sprintf("Your book '%s' is overdue! Please return it as soon as possible.", bookTitle)
		notificationType = "error"
	} else if daysUntilDue == 1 {
		message = fmt.Sprintf("Your book '%s' is due tomorrow. Please return it on time.", bookTitle)
		notificationType = "warning"
	} else {
		message = fmt.Sprintf("Your book '%s' is due in %d days.", bookTitle, daysUntilDue)
		notificationType = "info"
	}

	notification := &models.Notification{
		UserID:     userID,
		Title:      "Book Return Reminder",
		Message:    message,
		Type:       notificationType,
		Category:   "borrow",
		EntityID:   &borrowID,
		EntityType: "borrow",
		ActionURL:  "/borrows",
		IsRead:     false,
	}

	return r.Create(ctx, notification)
}

// CreateOverdueNotification creates an overdue book notification
func (r *NotificationRepository) CreateOverdueNotification(ctx context.Context, userID, borrowID uint, bookTitle string, daysOverdue int) error {
	message := fmt.Sprintf("Your book '%s' is %d days overdue! Please return it immediately to avoid additional fines.", bookTitle, daysOverdue)

	notification := &models.Notification{
		UserID:     userID,
		Title:      "Overdue Book Notice",
		Message:    message,
		Type:       "error",
		Category:   "borrow",
		EntityID:   &borrowID,
		EntityType: "borrow",
		ActionURL:  "/borrows",
		IsRead:     false,
	}

	return r.Create(ctx, notification)
}

// CreateReservationAvailableNotification creates a reservation available notification
func (r *NotificationRepository) CreateReservationAvailableNotification(ctx context.Context, userID, reservationID uint, bookTitle string) error {
	message := fmt.Sprintf("Good news! Your reserved book '%s' is now available for pickup.", bookTitle)

	notification := &models.Notification{
		UserID:     userID,
		Title:      "Book Available for Pickup",
		Message:    message,
		Type:       "success",
		Category:   "reservation",
		EntityID:   &reservationID,
		EntityType: "reservation",
		ActionURL:  "/reservations",
		IsRead:     false,
	}

	return r.Create(ctx, notification)
}

// CreateFineNotification creates a fine notification
func (r *NotificationRepository) CreateFineNotification(ctx context.Context, userID, fineID uint, amount float64, reason string) error {
	message := fmt.Sprintf("You have been charged a fine of $%.2f. Reason: %s", amount, reason)

	notification := &models.Notification{
		UserID:     userID,
		Title:      "Fine Issued",
		Message:    message,
		Type:       "warning",
		Category:   "fine",
		EntityID:   &fineID,
		EntityType: "fine",
		ActionURL:  "/fines",
		IsRead:     false,
	}

	return r.Create(ctx, notification)
}

// CreateNewBookNotification creates a new book notification
func (r *NotificationRepository) CreateNewBookNotification(ctx context.Context, bookID uint, title, category string) error {
	message := fmt.Sprintf("A new book '%s' has been added to the %s category.", title, category)

	// Get all users interested in this category (simplified - in reality you'd have user preferences)
	var userIDs []uint
	err := r.db.WithContext(ctx).Model(&models.User{}).
		Where("is_active = ?", true).
		Pluck("id", &userIDs).Error
	if err != nil {
		return fmt.Errorf("failed to get users for new book notification: %w", err)
	}

	// Batch insert notifications in chunks of 100 to avoid oversized SQL statements.
	const chunkSize = 100
	notifications := make([]models.Notification, 0, len(userIDs))
	for _, userID := range userIDs {
		notifications = append(notifications, models.Notification{
			UserID:     userID,
			Title:      "New Book Available",
			Message:    message,
			Type:       "info",
			Category:   "book",
			EntityID:   &bookID,
			EntityType: "book",
			ActionURL:  fmt.Sprintf("/books/%d", bookID),
			IsRead:     false,
		})
	}
	for i := 0; i < len(notifications); i += chunkSize {
		end := i + chunkSize
		if end > len(notifications) {
			end = len(notifications)
		}
		if err := r.db.WithContext(ctx).Create(notifications[i:end]).Error; err != nil {
			return fmt.Errorf("failed to batch create new-book notifications: %w", err)
		}
	}
	return nil
}

// CreateSystemNotification creates a system-wide notification
func (r *NotificationRepository) CreateSystemNotification(ctx context.Context, title, message string, notificationType string) error {
	// Get all active users
	var userIDs []uint
	err := r.db.WithContext(ctx).Model(&models.User{}).
		Where("is_active = ?", true).
		Pluck("id", &userIDs).Error
	if err != nil {
		return fmt.Errorf("failed to get users for system notification: %w", err)
	}

	// Create notifications for all active users
	for _, userID := range userIDs {
		notification := &models.Notification{
			UserID:   userID,
			Title:    title,
			Message:  message,
			Type:     notificationType,
			Category: "system",
			IsRead:   false,
		}

		if err := r.Create(ctx, notification); err != nil {
			// Log error but continue with other users
			continue
		}
	}

	return nil
}

// CleanupOldNotifications deletes notifications older than specified days
func (r *NotificationRepository) CleanupOldNotifications(ctx context.Context, daysOld int) error {
	cutoffDate := time.Now().AddDate(0, 0, -daysOld)

	return r.db.WithContext(ctx).
		Where("created_at < ?", cutoffDate).
		Delete(&models.Notification{}).Error
}

// GetNotificationStats gets statistics about notifications
func (r *NotificationRepository) GetNotificationStats(ctx context.Context) (map[string]interface{}, error) {
	var stats map[string]interface{} = make(map[string]interface{})

	// Total notifications
	var total int64
	if err := r.db.WithContext(ctx).Model(&models.Notification{}).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count total notifications: %w", err)
	}
	stats["total"] = total

	// Unread notifications
	var unread int64
	if err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("is_read = ?", false).Count(&unread).Error; err != nil {
		return nil, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	stats["unread"] = unread

	// Notifications by type
	var typeStats []struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	if err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Select("type, COUNT(*) as count").
		Group("type").
		Scan(&typeStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get notification type stats: %w", err)
	}
	stats["byType"] = typeStats

	// Notifications by category
	var categoryStats []struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}
	if err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Select("category, COUNT(*) as count").
		Group("category").
		Scan(&categoryStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get notification category stats: %w", err)
	}
	stats["byCategory"] = categoryStats

	return stats, nil
}

// GetUnreadCountByUserID gets the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCountByUserID(ctx context.Context, userID uint) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to get unread notification count: %w", err)
	}
	return count, nil
}

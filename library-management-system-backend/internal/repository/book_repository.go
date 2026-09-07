package repository

import (
	"context"
	"fmt"
	"time"

	"library-management-system-backend/internal/models"

	"gorm.io/gorm"
)

type BookRepository struct {
	db *gorm.DB
}

func NewBookRepository(db *gorm.DB) *BookRepository {
	return &BookRepository{db: db}
}

// Create creates a new book
func (r *BookRepository) Create(ctx context.Context, book *models.Book) error {
	return r.db.WithContext(ctx).Create(book).Error
}

// GetByID retrieves a book by ID
func (r *BookRepository) GetByID(ctx context.Context, id uint) (*models.Book, error) {
	var book models.Book
	err := r.db.WithContext(ctx).First(&book, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("book not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get book: %w", err)
	}
	return &book, nil
}

// GetByISBN retrieves a book by ISBN
func (r *BookRepository) GetByISBN(ctx context.Context, isbn string) (*models.Book, error) {
	var book models.Book
	err := r.db.WithContext(ctx).Where("isbn = ?", isbn).First(&book).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("book not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get book by ISBN: %w", err)
	}
	return &book, nil
}

// Update updates a book
func (r *BookRepository) Update(ctx context.Context, book *models.Book) error {
	return r.db.WithContext(ctx).Save(book).Error
}

// Delete deletes a book (soft delete)
func (r *BookRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Book{}, id).Error
}

// List retrieves books with pagination and filtering
func (r *BookRepository) List(ctx context.Context, page, limit int, search, category, status string) ([]models.Book, int64, error) {
	var books []models.Book
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Book{})

	// Apply search filter
	if search != "" {
		query = query.Where("title ILIKE ? OR author ILIKE ? OR isbn ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Apply category filter
	if category != "" {
		query = query.Where("category = ?", category)
	}

	// Apply status filter
	if status != "" {
		switch status {
		case "available":
			query = query.Where("available_copies > 0")
		case "borrowed":
			query = query.Where("available_copies = 0")
		}
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count books: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&books).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list books: %w", err)
	}

	return books, total, nil
}

// GetAvailableBooks retrieves all available books
func (r *BookRepository) GetAvailableBooks(ctx context.Context) ([]models.Book, error) {
	var books []models.Book
	err := r.db.WithContext(ctx).Where("available_copies > 0").Find(&books).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get available books: %w", err)
	}
	return books, nil
}

// GetPopularBooks retrieves the most borrowed books
func (r *BookRepository) GetPopularBooks(ctx context.Context, limit int) ([]models.Book, error) {
	var books []models.Book
	err := r.db.WithContext(ctx).
		Joins("LEFT JOIN borrows ON books.id = borrows.book_id").
		Group("books.id").
		Order("COUNT(borrows.id) DESC").
		Limit(limit).
		Find(&books).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get popular books: %w", err)
	}
	return books, nil
}

// GetBooksByCategory retrieves books by category
func (r *BookRepository) GetBooksByCategory(ctx context.Context, category string) ([]models.Book, error) {
	var books []models.Book
	err := r.db.WithContext(ctx).Where("category = ?", category).Find(&books).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get books by category: %w", err)
	}
	return books, nil
}

// GetOverdueBooks retrieves books that are overdue
func (r *BookRepository) GetOverdueBooks(ctx context.Context) ([]models.Book, error) {
	var books []models.Book
	err := r.db.WithContext(ctx).
		Joins("JOIN borrows ON books.id = borrows.book_id").
		Where("borrows.due_date < ? AND borrows.returned_at IS NULL", time.Now()).
		Find(&books).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get overdue books: %w", err)
	}
	return books, nil
}

// UpdateAvailableCopies updates the available copies of a book
func (r *BookRepository) UpdateAvailableCopies(ctx context.Context, bookID uint, copies int) error {
	return r.db.WithContext(ctx).Model(&models.Book{}).Where("id = ?", bookID).Update("available_copies", copies).Error
}

// DecrementAvailableCopies decrements the available copies of a book
func (r *BookRepository) DecrementAvailableCopies(ctx context.Context, bookID uint) error {
	return r.db.WithContext(ctx).Model(&models.Book{}).Where("id = ? AND available_copies > 0", bookID).UpdateColumn("available_copies", gorm.Expr("available_copies - 1")).Error
}

// IncrementAvailableCopies increments the available copies of a book
func (r *BookRepository) IncrementAvailableCopies(ctx context.Context, bookID uint) error {
	return r.db.WithContext(ctx).Model(&models.Book{}).Where("id = ?", bookID).UpdateColumn("available_copies", gorm.Expr("available_copies + 1")).Error
}

// GetBookStats retrieves statistics for a book
func (r *BookRepository) GetBookStats(ctx context.Context, bookID uint) (map[string]interface{}, error) {
	var stats map[string]interface{}

	// Get total borrows
	var totalBorrows int64
	err := r.db.WithContext(ctx).Model(&models.Borrow{}).Where("book_id = ?", bookID).Count(&totalBorrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get book stats: %w", err)
	}

	// Get current borrows
	var currentBorrows int64
	err = r.db.WithContext(ctx).Model(&models.Borrow{}).Where("book_id = ? AND returned_at IS NULL", bookID).Count(&currentBorrows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get book stats: %w", err)
	}

	stats = map[string]interface{}{
		"totalBorrows":   totalBorrows,
		"currentBorrows": currentBorrows,
	}

	return stats, nil
}

// GetCategories retrieves distinct categories from all books
func (r *BookRepository) GetCategories(ctx context.Context) ([]string, error) {
	var categories []string
	err := r.db.WithContext(ctx).Model(&models.Book{}).
		Distinct("category").
		Where("deleted_at IS NULL").
		Pluck("category", &categories).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get book categories: %w", err)
	}
	return categories, nil
}

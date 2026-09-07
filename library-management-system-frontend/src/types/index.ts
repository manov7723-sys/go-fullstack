// User types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "user" | "admin" | "librarian";
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

// Book types
export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publishedDate?: string;
  description?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookCreateRequest {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publishedDate?: string;
  description?: string;
  copies: number;
}

export interface BookUpdateRequest {
  title?: string;
  author?: string;
  category?: string;
  publishedDate?: string;
  description?: string;
  copies?: number;
}

export interface BookSearchRequest {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sort?: "title" | "author" | "created_at";
  order?: "asc" | "desc";
}

export interface BookSearchResponse {
  books: Book[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Borrow types
export interface Borrow {
  id: number;
  userId: number;
  bookId: number;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  fineAmount: number;
  status: "borrowed" | "returned" | "overdue";
  createdAt: string;
  updatedAt: string;
  user?: User;
  book?: Book;
}

export interface BorrowCreateRequest {
  bookId: number;
}

export interface BorrowReturnRequest {
  borrowId: number;
}

export interface BorrowSearchRequest {
  userId?: number;
  bookId?: number;
  status?: "borrowed" | "returned" | "overdue";
  page?: number;
  limit?: number;
}

export interface BorrowSearchResponse {
  borrows: Borrow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Reservation types
export interface Reservation {
  id: number;
  userId: number;
  bookId: number;
  reservationDate: string;
  expiresAt: string;
  status: "active" | "fulfilled" | "expired";
  createdAt: string;
  updatedAt: string;
  user?: User;
  book?: Book;
}

export interface ReservationCreateRequest {
  bookId: number;
}

export interface ReservationSearchRequest {
  userId?: number;
  bookId?: number;
  status?: "active" | "fulfilled" | "expired";
  page?: number;
  limit?: number;
}

export interface ReservationSearchResponse {
  reservations: Reservation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Fine types
export interface Fine {
  id: number;
  userId: number;
  borrowId: number;
  amount: number;
  reason: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  borrow?: Borrow;
}

export interface FineCreateRequest {
  borrowId: number;
  amount: number;
  reason: string;
}

export interface FinePaymentRequest {
  fineId: number;
}

export interface FineSearchRequest {
  userId?: number;
  borrowId?: number;
  isPaid?: boolean;
  page?: number;
  limit?: number;
}

export interface FineSearchResponse {
  fines: Fine[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}

// Dashboard types
export interface DashboardStats {
  totalBooks: number;
  totalUsers: number;
  totalBorrows: number;
  totalReservations: number;
  overdueBooks: number;
  totalFines: number;
  recentBorrows: Borrow[];
  recentBooks: Book[];
}

// Admin types
export interface AdminStats {
  totalBooks: number;
  totalUsers: number;
  totalBorrows: number;
  activeBorrows: number;
  overdueBorrows: number;
  totalReservations: number;
  overdueBooks: number;
  totalFines: number;
  popularBooks: Array<{
    book: Book;
    borrowCount: number;
  }>;
}

// Common types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

// Notification types
export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  category: "borrow" | "reservation" | "fine" | "book" | "system";
  isRead: boolean;
  entityId?: number; // ID of related entity (book, borrow, etc.)
  entityType?: string; // Type of related entity
  actionUrl?: string; // URL to navigate to when clicked
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCreateRequest {
  userId: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  category: "borrow" | "reservation" | "fine" | "book" | "system";
  entityId?: number;
  entityType?: string;
  actionUrl?: string;
}

export interface NotificationSearchRequest {
  page?: number;
  limit?: number;
  isRead?: boolean;
  category?: string;
  type?: string;
}

export interface NotificationSearchResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  unreadCount: number;
}

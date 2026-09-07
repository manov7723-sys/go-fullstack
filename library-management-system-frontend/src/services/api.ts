import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { toast } from "../hooks/use-toast";
import {
  User,
  LoginRequest,
  RegisterRequest,
  UserUpdateRequest,
  Book,
  BookCreateRequest,
  BookUpdateRequest,
  BookSearchRequest,
  BookSearchResponse,
  Borrow,
  BorrowCreateRequest,
  BorrowSearchRequest,
  BorrowSearchResponse,
  Reservation,
  ReservationCreateRequest,
  ReservationSearchRequest,
  ReservationSearchResponse,
  Fine,
  FineCreateRequest,
  FineSearchRequest,
  FineSearchResponse,
  Notification,
  NotificationCreateRequest,
  NotificationSearchRequest,
  NotificationSearchResponse,
  DashboardStats,
  AdminStats,
  PaginatedResponse,
} from "../types";

// In Docker, nginx proxies /api/ to the backend container.
// For local dev (no Docker), requests go directly to the backend on :8080.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          const url = error.config?.url || "";
          if (url.includes("/auth/me") || url.includes("/auth/refresh")) {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }
        }

        const errorData = error.response?.data as any;
        const errorMessage =
          errorData?.error || errorData?.message || error.message || "An error occurred";

        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });

        return Promise.reject(error);
      },
    );
  }

  protected async request<T>(config: any): Promise<T> {
    const response = await this.api.request(config);
    return response.data;
  }
}

// ─── Auth API ────────────────────────────────────────────────────────────────

class AuthApi extends ApiService {
  async login(credentials: LoginRequest): Promise<{ user: User; accessToken: string }> {
    const response = await this.request<{
      message: string;
      user: User;
      tokens: { access_token: string; refresh_token: string };
    }>({
      method: "POST",
      url: "/auth/login",
      data: credentials,
    });
    return { user: response.user, accessToken: response.tokens.access_token };
  }

  async register(userData: RegisterRequest): Promise<{ user: User; accessToken: string }> {
    const response = await this.request<{
      message: string;
      user: User;
      tokens: { access_token: string; refresh_token: string };
    }>({
      method: "POST",
      url: "/auth/register",
      data: userData,
    });
    return { user: response.user, accessToken: response.tokens.access_token };
  }

  async getCurrentUser(): Promise<User> {
    return this.request({ method: "GET", url: "/auth/me" });
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await this.request<{
      tokens: { access_token: string };
    }>({
      method: "POST",
      url: "/auth/refresh",
      data: { refreshToken },
    });
    return { accessToken: response.tokens.access_token };
  }
}

// ─── User API ────────────────────────────────────────────────────────────────

class UserApi extends ApiService {
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<PaginatedResponse<User>> {
    return this.request({ method: "GET", url: "/admin/users", params });
  }

  async getUser(): Promise<User> {
    const response = await this.request<{ user: User }>({
      method: "GET",
      url: "/users/profile",
    });
    return response.user;
  }

  async updateUser(userData: UserUpdateRequest): Promise<User> {
    const response = await this.request<{ message: string; user: User }>({
      method: "PUT",
      url: "/users/profile",
      data: userData,
    });
    return response.user;
  }

  async deleteUser(id: number): Promise<void> {
    return this.request({ method: "DELETE", url: `/admin/users/${id}` });
  }

  async deactivateUser(id: number): Promise<void> {
    return this.request({ method: "PUT", url: `/admin/users/${id}/deactivate` });
  }

  async activateUser(id: number): Promise<void> {
    return this.request({ method: "PUT", url: `/admin/users/${id}/activate` });
  }
}

// ─── Book API ────────────────────────────────────────────────────────────────

class BookApi extends ApiService {
  async getBooks(params?: BookSearchRequest): Promise<BookSearchResponse> {
    return this.request({ method: "GET", url: "/books", params });
  }

  async getAdminBooks(params?: BookSearchRequest): Promise<BookSearchResponse> {
    return this.request({ method: "GET", url: "/admin/books", params });
  }

  async getBook(id: number): Promise<Book> {
    const response = await this.request<{ book: Book }>({
      method: "GET",
      url: `/books/${id}`,
    });
    return response.book;
  }

  async createBook(bookData: BookCreateRequest): Promise<Book> {
    const response = await this.request<{ message: string; book: Book }>({
      method: "POST",
      url: "/admin/books",
      data: bookData,
    });
    return response.book;
  }

  async updateBook(id: number, bookData: BookUpdateRequest): Promise<Book> {
    const response = await this.request<{ message: string; book: Book }>({
      method: "PUT",
      url: `/admin/books/${id}`,
      data: bookData,
    });
    return response.book;
  }

  async deleteBook(id: number): Promise<void> {
    return this.request({ method: "DELETE", url: `/admin/books/${id}` });
  }
}

// ─── Borrow API ──────────────────────────────────────────────────────────────

class BorrowApi extends ApiService {
  async getBorrows(params?: BorrowSearchRequest): Promise<BorrowSearchResponse> {
    return this.request({ method: "GET", url: "/borrows", params });
  }

  async getAdminBorrows(params?: BorrowSearchRequest): Promise<BorrowSearchResponse> {
    return this.request({ method: "GET", url: "/admin/borrows", params });
  }

  async getBorrow(id: number): Promise<Borrow> {
    const response = await this.request<{ borrow: Borrow }>({
      method: "GET",
      url: `/borrows/${id}`,
    });
    return response.borrow;
  }

  async createBorrow(borrowData: BorrowCreateRequest): Promise<Borrow> {
    const response = await this.request<{ message: string; borrow: Borrow }>({
      method: "POST",
      url: "/borrows",
      data: borrowData,
    });
    return response.borrow;
  }

  async returnBook(borrowId: number): Promise<void> {
    return this.request({ method: "PUT", url: `/borrows/${borrowId}/return` });
  }

  async extendBorrow(borrowId: number, newDueDate: string): Promise<void> {
    return this.request({
      method: "PUT",
      url: `/admin/borrows/${borrowId}/extend`,
      data: { newDueDate },
    });
  }
}

// ─── Reservation API ─────────────────────────────────────────────────────────

class ReservationApi extends ApiService {
  async getReservations(params?: ReservationSearchRequest): Promise<ReservationSearchResponse> {
    return this.request({ method: "GET", url: "/reservations", params });
  }

  async getAdminReservations(params?: ReservationSearchRequest): Promise<ReservationSearchResponse> {
    return this.request({ method: "GET", url: "/admin/reservations", params });
  }

  async getReservation(id: number): Promise<Reservation> {
    const response = await this.request<{ reservation: Reservation }>({
      method: "GET",
      url: `/reservations/${id}`,
    });
    return response.reservation;
  }

  async createReservation(reservationData: ReservationCreateRequest): Promise<Reservation> {
    const response = await this.request<{ message: string; reservation: Reservation }>({
      method: "POST",
      url: "/reservations",
      data: reservationData,
    });
    return response.reservation;
  }

  async cancelReservation(id: number): Promise<void> {
    return this.request({ method: "DELETE", url: `/reservations/${id}` });
  }

  async fulfillReservation(id: number): Promise<void> {
    return this.request({
      method: "PUT",
      url: `/admin/reservations/${id}/fulfill`,
    });
  }
}

// ─── Fine API ────────────────────────────────────────────────────────────────

class FineApi extends ApiService {
  async getFines(params?: FineSearchRequest): Promise<FineSearchResponse> {
    return this.request({ method: "GET", url: "/fines", params });
  }

  async getAdminFines(params?: FineSearchRequest): Promise<FineSearchResponse> {
    return this.request({ method: "GET", url: "/admin/fines", params });
  }

  async getFine(id: number): Promise<Fine> {
    const response = await this.request<{ fine: Fine }>({
      method: "GET",
      url: `/fines/${id}`,
    });
    return response.fine;
  }

  async createFine(fineData: FineCreateRequest): Promise<Fine> {
    const response = await this.request<{ message: string; fine: Fine }>({
      method: "POST",
      url: "/admin/fines",
      data: fineData,
    });
    return response.fine;
  }

  async payFine(id: number): Promise<void> {
    return this.request({ method: "PUT", url: `/fines/${id}/pay` });
  }
}

// ─── Dashboard API ───────────────────────────────────────────────────────────

class DashboardApi extends ApiService {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.request<{
      dashboard: {
        activeBorrows: number;
        overdueBorrows: number;
        totalBorrows: number;
        totalFines: number;
        unpaidFines: number;
      };
    }>({
      method: "GET",
      url: "/users/dashboard",
    });

    return {
      totalBooks: 0,
      totalUsers: 0,
      totalBorrows: response.dashboard.totalBorrows,
      totalReservations: 0,
      overdueBooks: response.dashboard.overdueBorrows,
      totalFines: response.dashboard.totalFines,
      recentBorrows: [],
      recentBooks: [],
    };
  }

  async getAdminStats(): Promise<AdminStats> {
    return this.request({ method: "GET", url: "/admin/analytics/dashboard" });
  }
}

// ─── Notification API ────────────────────────────────────────────────────────

class NotificationApi extends ApiService {
  async getNotifications(params?: NotificationSearchRequest): Promise<NotificationSearchResponse> {
    return this.request({ method: "GET", url: "/notifications", params });
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.request<{ count: number }>({
      method: "GET",
      url: "/notifications/unread-count",
    });
    return response.count;
  }

  async markAsRead(id: number): Promise<void> {
    return this.request({ method: "PUT", url: `/notifications/${id}/read` });
  }

  async markAllAsRead(): Promise<void> {
    return this.request({ method: "PUT", url: "/notifications/mark-all-read" });
  }

  async deleteNotification(id: number): Promise<void> {
    return this.request({ method: "DELETE", url: `/notifications/${id}` });
  }

  async createNotification(data: NotificationCreateRequest): Promise<Notification> {
    const response = await this.request<{ notification: Notification }>({
      method: "POST",
      url: "/notifications",
      data,
    });
    return response.notification;
  }

  async generateBookReturnReminder(borrowId: number): Promise<void> {
    return this.request({
      method: "POST",
      url: "/notifications/generate/book-return-reminder",
      data: { borrowId },
    });
  }

  async generateOverdueNotification(borrowId: number): Promise<void> {
    return this.request({
      method: "POST",
      url: "/notifications/generate/overdue-notification",
      data: { borrowId },
    });
  }

  async generateReservationAvailable(reservationId: number): Promise<void> {
    return this.request({
      method: "POST",
      url: "/notifications/generate/reservation-available",
      data: { reservationId },
    });
  }

  async generateFineNotification(fineId: number): Promise<void> {
    return this.request({
      method: "POST",
      url: "/notifications/generate/fine-notification",
      data: { fineId },
    });
  }

  async generateNewBookNotification(bookId: number, category?: string): Promise<void> {
    return this.request({
      method: "POST",
      url: "/notifications/generate/new-book-notification",
      data: { bookId, category },
    });
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const authApi = new AuthApi();
export const userApi = new UserApi();
export const bookApi = new BookApi();
export const borrowApi = new BorrowApi();
export const reservationApi = new ReservationApi();
export const fineApi = new FineApi();
export const dashboardApi = new DashboardApi();
export const notificationApi = new NotificationApi();

export default ApiService;

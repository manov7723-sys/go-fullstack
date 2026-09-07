<div align="center">

# 📚 Library Management System

**A full-stack, production-ready library management platform built with Go and React.**

[![Go](https://img.shields.io/badge/Go-1.21-00ADD8?style=flat-square&logo=go&logoColor=white)](https://golang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Screenshots](#-screenshots)

</div>

---

## ✨ Features

### For Library Users
- 🔍 **Browse & Search** — Full-text search across title, author, ISBN, and category with real-time filtering
- 📖 **Borrow Books** — Borrow available books with configurable due dates
- 🔖 **Reserve Books** — Reserve unavailable books; automatic 7-day expiry
- 💸 **Fine Management** — View outstanding fines, pay them online; $0.50/day overdue rate with $50 cap
- 🔔 **Notifications** — Real-time in-app notifications for due dates, overdue alerts, reservation availability, and fines
- 👤 **Profile Management** — Update personal details and view borrowing history

### For Administrators
- 📊 **Admin Dashboard** — Live aggregate stats: total books, users, borrows, reservations, overdue counts, fine totals, and popular books
- 📚 **Book Management** — Create, update, delete books; manage copy counts
- 👥 **User Management** — Activate/deactivate accounts, edit user roles, view activity
- 📋 **Borrow Management** — View all borrows, extend due dates, force-return books
- 📅 **Reservation Management** — Monitor reservations, fulfill or cancel them
- 💰 **Fine Management** — Create, update, and delete fines; view top defaulters
- 📈 **Reports & Analytics** — Borrowing trends, user activity, revenue charts, popular books with JSON export

### Platform
- 🌙 **Dark / Light Mode** — Persistent theme preference
- 📱 **Fully Responsive** — Mobile-first design, works on all screen sizes
- ⚡ **Production-Grade Performance** — Server-side in-memory caching, composite DB indexes, N+1-free queries, optimistic UI updates, smart TanStack Query cache
- 🔐 **JWT Auth** — Access token (24h) + refresh token (7d) with Redis-based blacklisting
- 🐳 **One-Command Deploy** — Full Docker Compose stack with health-checked startup ordering

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 5, Vite 5, TanStack Query v5, shadcn/ui, Tailwind CSS 3, Radix UI, Formik + Yup |
| **Backend** | Go 1.21, Gin, GORM v2 |
| **Database** | PostgreSQL 15 with composite indexes |
| **Cache** | Redis 7 (token blacklist) + in-process TTL cache (dashboard stats) |
| **Auth** | JWT (golang-jwt/jwt v5), bcrypt password hashing |
| **Container** | Docker, Docker Compose, multi-stage builds, nginx |
| **Proxy** | nginx (SPA fallback, `/api/` proxy, gzip, static asset caching) |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2 (included with Docker Desktop)
- `make` (pre-installed on macOS/Linux; Windows: [Git Bash](https://git-scm.com/download/win) or WSL)

### 1 — Clone & configure

```bash
git clone https://github.com/biswojit65/Library_Management_System.git
cd Library_Management_System

# Copy the environment template
cp .env.example .env
```

Open `.env` and **at minimum** set a strong `JWT_SECRET` (≥ 32 characters) and `DB_PASSWORD`.

### 2 — Start the stack

```bash
make up
```

This single command:
1. Builds the Go backend Docker image (multi-stage, ~15 MB final layer)
2. Builds the React frontend Docker image (Vite production bundle + nginx)
3. Starts PostgreSQL 15 and Redis 7 with health checks
4. Waits for both databases to be healthy, then starts the backend
5. Runs GORM `AutoMigrate` (creates/updates all tables)
6. Applies `init_database.sql` seed data (idempotent — safe to re-run)
7. Waits for the backend to pass its health check, then starts the frontend

### 3 — Open the app

| Service | URL |
|---|---|
| **App** | http://localhost:3000 |
| **API** | http://localhost:8080/api/v1 |
| **Health** | http://localhost:8080/health |

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@library.com | `Admin123!` |
| **Librarian** | librarian@library.com | `Librarian123!` |
| **User** | john.doe@email.com | `User123!` |

> Seven additional regular user accounts exist — all share the `User123!` password.

---

## 🏗 Architecture

```
Browser (port 3000)
        │
        ▼
┌──────────────────────────────────┐
│  library_frontend                │
│  nginx :80                       │
│                                  │
│  /          → React SPA (static) │
│  /api/*  ───┐  (gzip, immutable  │
└─────────────┼────────────────────┘
              │ proxy_pass (Docker internal network)
              ▼
┌──────────────────────────────────┐
│  library_backend                 │
│  Gin :8080                       │
│                                  │
│  • JWT auth middleware           │
│  • GORM repository layer         │
│  • In-memory TTL cache (stats)   │
└───┬───────────────────┬──────────┘
    │                   │
    ▼                   ▼
┌──────────┐    ┌──────────────┐
│PostgreSQL│    │   Redis 7    │
│    :5432 │    │   :6379      │
│          │    │ (JWT         │
│ Primary  │    │  blacklist)  │
│ datastore│    └──────────────┘
└──────────┘
```

**Data flow:**
1. Browser makes all requests to nginx on port 3000
2. Static assets (`/`, `.js`, `.css`) are served directly by nginx with long-lived cache headers
3. API calls (`/api/*`) are proxied to the Go backend on the Docker internal network — the backend hostname is never exposed to the browser
4. The backend applies JWT authentication, delegates to the repository layer, and optionally serves from the in-memory TTL cache for expensive aggregate queries
5. GORM connects to PostgreSQL; Redis stores token blacklists for logout invalidation

**Startup ordering (enforced by Docker health checks):**
```
postgres healthy → redis healthy → backend healthy → frontend starts
```

---

## 📁 Project Structure

```
.
├── .env.example                                    # Environment variable template
├── docker-compose.yml                              # Four-service stack
├── Makefile                                        # Developer shortcuts
├── CLAUDE.md                                       # Engineering notes for AI / contributors
│
├── library-management-system-backend/
│   ├── Dockerfile                                  # Multi-stage Go build
│   ├── go.mod / go.sum
│   ├── cmd/
│   │   └── main.go                                 # Entry point → graceful shutdown
│   ├── scripts/
│   │   └── init_database.sql                       # Idempotent schema + seed data
│   └── internal/
│       ├── auth/                                   # JWT generation & validation, bcrypt
│       ├── cache/                                  # In-process TTL cache (zero deps)
│       ├── config/                                 # Viper-based env config loader
│       ├── database/                               # GORM connection + AutoMigrate
│       ├── middleware/                             # Auth, CORS, rate-limit, logger
│       ├── models/                                 # GORM models with index tags
│       │   ├── book.go
│       │   ├── borrow.go                           # Composite idx: (user_id,status), (status,due_date)
│       │   ├── fine.go                             # Composite idx: (user_id,is_paid)
│       │   ├── notification.go                     # Composite idx: (user_id,is_read)
│       │   ├── reservation.go                      # Composite idx: (user_id,status), (status,expires_at)
│       │   └── user.go
│       ├── repository/                             # Data access — all SQL here, no SQL in handlers
│       │   ├── book_repository.go
│       │   ├── borrow_repository.go
│       │   ├── fine_repository.go
│       │   ├── notification_repository.go          # Batch insert for fan-out notifications
│       │   ├── reservation_repository.go
│       │   └── user_repository.go
│       ├── routes/                                 # Gin handlers + route registration
│       │   └── routes.go                           # ~2400 lines, all handlers inline
│       └── server/
│           └── server.go                           # HTTP server, middleware chain, route groups
│
└── library-management-system-frontend/
    ├── Dockerfile                                  # Node build → nginx serve
    ├── nginx.conf                                  # Proxy, gzip, cache headers, SPA fallback
    ├── index.html
    ├── vite.config.ts                              # Code splitting per library
    ├── tailwind.config.js
    └── src/
        ├── App.tsx                                 # Route definitions (all lazy-loaded)
        ├── main.tsx                                # QueryClient, providers, toasters
        ├── components/
        │   ├── Layout/                             # Header, Sidebar, Layout (responsive)
        │   └── ui/                                 # shadcn/ui component library
        ├── contexts/
        │   ├── AuthContext.tsx                     # useReducer auth + JWT storage
        │   ├── NotificationContext.tsx             # Poll unread count every 30s
        │   └── ThemeContext.tsx                    # Dark/light, persisted to localStorage
        ├── hooks/
        │   ├── useAlert.tsx                        # Custom confirm dialog
        │   ├── useAuth.ts
        │   └── useNotifications.ts
        ├── pages/
        │   ├── Admin/
        │   │   ├── AdminBooks.tsx
        │   │   ├── AdminBorrows.tsx
        │   │   ├── AdminDashboard.tsx
        │   │   ├── AdminFines.tsx
        │   │   ├── AdminReports.tsx
        │   │   ├── AdminReservations.tsx
        │   │   └── AdminUsers.tsx
        │   ├── Auth/
        │   │   ├── Login.tsx
        │   │   └── Register.tsx
        │   ├── Books/
        │   │   ├── BookDetail.tsx
        │   │   └── Books.tsx
        │   ├── Borrows/Borrows.tsx
        │   ├── Dashboard/Dashboard.tsx
        │   ├── Fines/Fines.tsx
        │   ├── Profile/Profile.tsx
        │   ├── Reservations/Reservations.tsx
        │   └── Settings/Settings.tsx
        ├── services/
        │   └── api.ts                              # Axios client hierarchy, typed response unwrapping
        └── types/
            └── index.ts                            # All shared TypeScript interfaces
```

---

## ⚙️ Make Commands

```bash
make up           # Build images and start all services (detached)
make down         # Stop all services
make build        # Rebuild Docker images without cache
make restart      # Restart all running services
make logs         # Follow logs from all services
make clean        # Stop services and remove all Docker volumes (⚠ deletes data)
make seed         # Re-run the SQL seed script against the running database
make health       # Check liveness of the backend and frontend
make dev-backend  # Run the Go backend locally (requires local Postgres + Redis)
make dev-frontend # Run the Vite dev server locally
```

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` before starting:

```bash
cp .env.example .env
```

| Variable | Default | Required | Description |
|---|---|---|---|
| `DB_NAME` | `library_db` | | PostgreSQL database name |
| `DB_USER` | `library_user` | | PostgreSQL username |
| `DB_PASSWORD` | — | ✅ | PostgreSQL password |
| `REDIS_HOST` | `redis` | | Redis hostname |
| `REDIS_PORT` | `6379` | | Redis port |
| `REDIS_PASSWORD` | *(empty)* | | Redis password (blank = no auth) |
| `JWT_SECRET` | — | ✅ | JWT signing secret — minimum 32 characters |
| `JWT_EXPIRY` | `24h` | | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `168h` | | Refresh token lifetime (7 days) |
| `VITE_API_URL` | `/api/v1` | | API base URL — **baked at build time** by Vite |
| `ENVIRONMENT` | `production` | | Set to `development` to enable Gin debug mode |

> **`VITE_API_URL` note:** This variable is embedded into the JavaScript bundle at build time by Vite — it cannot be changed at runtime. In Docker the default `/api/v1` works because nginx proxies `/api/` to the backend. For local development without Docker, set `VITE_API_URL=http://localhost:8080/api/v1` in `library-management-system-frontend/.env.local`.

---

## 📡 API Reference

All routes are prefixed with `/api/v1`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register a new user account |
| `POST` | `/auth/login` | — | Login; returns `accessToken` + `refreshToken` |
| `POST` | `/auth/refresh` | — | Exchange refresh token for a new access token |
| `POST` | `/auth/logout` | User | Invalidate the current token (Redis blacklist) |
| `GET` | `/auth/me` | User | Return the currently authenticated user |

**Login response:**
```json
{
  "message": "Login successful",
  "user": { "id": 1, "email": "...", "firstName": "...", "role": "user" },
  "tokens": { "accessToken": "...", "refreshToken": "..." }
}
```

### Books

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/books` | — | List books — query params: `search`, `category`, `page`, `limit` |
| `GET` | `/books/:id` | — | Single book details |
| `GET` | `/books/categories` | — | Available category list |
| `POST` | `/admin/books` | Admin | Create a book |
| `PUT` | `/admin/books/:id` | Admin | Update book metadata |
| `DELETE` | `/admin/books/:id` | Admin | Soft-delete a book |
| `PUT` | `/admin/books/:id/copies` | Admin | Update copy count |
| `GET` | `/admin/books` | Admin | Admin book list with full metadata |

**Paginated list response shape:**
```json
{
  "books": [...],
  "total": 42,
  "page": 1,
  "limit": 10,
  "pages": 5
}
```

### Borrows

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/borrows` | User | Borrow a book (`bookId`, `dueDate`) |
| `GET` | `/borrows` | User | Own borrows — query: `status` (borrowed/returned/overdue) |
| `GET` | `/borrows/:id` | User | Single borrow detail |
| `PUT` | `/borrows/:id/return` | User | Return a book |
| `GET` | `/borrows/overdue` | User | Own overdue borrows |
| `GET` | `/admin/borrows` | Admin | All borrows with user + book info |
| `PUT` | `/admin/borrows/:id/extend` | Admin | Extend due date |
| `PUT` | `/admin/borrows/:id/force-return` | Admin | Force return without user action |

### Reservations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/reservations` | User | Reserve a book |
| `GET` | `/reservations` | User | Own reservations — query: `status` (active/fulfilled/expired) |
| `GET` | `/reservations/:id` | User | Single reservation detail |
| `DELETE` | `/reservations/:id` | User | Cancel a reservation |
| `GET` | `/admin/reservations` | Admin | All reservations |
| `PUT` | `/admin/reservations/:id/fulfill` | Admin | Mark reservation fulfilled |

### Fines

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/fines` | User | Own fines — query: `isPaid` |
| `GET` | `/fines/:id` | User | Single fine detail |
| `PUT` | `/fines/:id/pay` | User | Pay a fine |
| `GET` | `/fines/summary` | User | Aggregated totals (paid/unpaid) |
| `GET` | `/admin/fines` | Admin | All fines |
| `POST` | `/admin/fines` | Admin | Create a manual fine |
| `PUT` | `/admin/fines/:id` | Admin | Update a fine |
| `DELETE` | `/admin/fines/:id` | Admin | Delete a fine |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | User | Own notifications — query: `isRead`, `category`, `type` |
| `GET` | `/notifications/unread-count` | User | Count of unread notifications |
| `PUT` | `/notifications/:id/read` | User | Mark one as read |
| `PUT` | `/notifications/mark-all-read` | User | Mark all as read |
| `DELETE` | `/notifications/:id` | User | Delete a notification |

### Users (admin)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/users` | Admin | List users — query: `search`, `role`, `page`, `limit` |
| `GET` | `/admin/users/:id` | Admin | Single user |
| `PUT` | `/admin/users/:id` | Admin | Update user details or role |
| `DELETE` | `/admin/users/:id` | Admin | Soft-delete a user |
| `PUT` | `/admin/users/:id/activate` | Admin | Activate account |
| `PUT` | `/admin/users/:id/deactivate` | Admin | Deactivate account |

### Dashboard & Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/dashboard` | User | User-scoped stats (borrows, fines) |
| `GET` | `/admin/analytics/dashboard` | Admin | Full system stats — **cached 5 min** |
| `GET` | `/admin/reports/overview` | Admin | Overview report |
| `GET` | `/admin/reports/books` | Admin | Book-level report |
| `GET` | `/admin/reports/users` | Admin | User-level report |
| `GET` | `/admin/reports/fines` | Admin | Fine report |

### Error responses

All errors return:
```json
{ "error": "Human-readable message" }
```

---

## ⚡ Performance

The system is tuned for production throughput at every layer:

### Database
- **8 composite indexes** added via GORM tags (auto-applied at startup):
  - `borrows (user_id, status)`, `borrows (status, due_date)`
  - `fines (user_id, is_paid)`
  - `reservations (user_id, status)`, `reservations (status, expires_at)`
  - `notifications (user_id, is_read)`
- **Single-query aggregations** — stats endpoints use PostgreSQL `COUNT(*) FILTER (WHERE …)` to collapse what were 4–6 separate COUNT queries into one round-trip

### Backend caching
- **In-memory TTL cache** (`internal/cache/cache.go`) — zero external dependencies, goroutine-safe, 1-minute background eviction
- Admin dashboard stats cached for **5 minutes**; automatically invalidated on any book, borrow, or fine mutation
- Connection pool: `MaxIdleConns=25`, `ConnMaxIdleTime=5min`

### Frontend caching
- **TanStack Query** with per-query `staleTime`:
  - Dashboard stats & borrows → `30s` (aligned with server cache TTL)
  - Books, fines, reservations → `2min` (default)
  - Profile, settings → `10min`
  - All data retained in memory for `10min` (`gcTime`) after last subscriber unmounts
- **Code splitting** — Vite bundles split into named async chunks: `vendor`, `radix`, `router`, `query`, `icons`, `motion`, `forms`, `toast`
- All route components are **lazy-loaded** with `React.lazy`

### nginx
- gzip compression including `application/json`
- Static assets served with `Cache-Control: public, immutable; max-age=1y`
- `index.html` served with `no-cache` so new JS chunks always load
- API proxy uses HTTP/1.1 keep-alive with tuned buffer sizes and timeouts

---

## 💻 Local Development (without Docker)

You need local PostgreSQL 15 and Redis 7. Then:

```bash
# 1. Backend
cd library-management-system-backend
cp .env.example .env        # edit DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET, etc.
go run ./cmd/main.go

# 2. Frontend (separate terminal)
cd library-management-system-frontend
echo "VITE_API_URL=http://localhost:8080/api/v1" > .env.local
npm install
npm run dev
# Open http://localhost:5173
```

### Running tests

```bash
# Backend unit tests
cd library-management-system-backend
go test ./...

# Frontend type check
cd library-management-system-frontend
npm run type-check

# Frontend lint
npm run lint
```

---

## 🗄 Database Operations

```bash
# Re-seed demo data while the stack is running
make seed

# Open a psql shell
docker compose exec postgres psql -U library_user -d library_db

# Dump a backup
docker compose exec postgres pg_dump -U library_user library_db > backup.sql

# Restore from backup
docker compose exec -T postgres psql -U library_user -d library_db < backup.sql

# Reset all data (⚠ destructive)
make clean && make up
```

**Migrations** are managed by GORM `AutoMigrate` — runs automatically on every backend startup. It is **additive-only**: adds missing columns and tables, never drops anything. To add a new entity:
1. Define the GORM model struct in `internal/models/`
2. Add the type to the `AutoMigrate()` call in `internal/database/database.go`
3. Add seed rows to `scripts/init_database.sql` with `ON CONFLICT DO NOTHING`

---

## 🖼 Screenshots

<details>
<summary>User Dashboard</summary>

> Welcome card with role badge, stat cards (books, borrows, reservations, fines), recent borrows, recently added books, and quick-action buttons.

</details>

<details>
<summary>Book Catalogue</summary>

> Searchable, filterable grid of all library books with availability badges, borrow/reserve buttons, and pagination.

</details>

<details>
<summary>Admin Dashboard</summary>

> Aggregate KPI cards linked to their management pages, popular books leaderboard, and quick-action navigation.

</details>

<details>
<summary>Admin Book Management</summary>

> Searchable table with inline add/edit modals, ISBN validation, and soft-delete.

</details>

<details>
<summary>Notifications Panel</summary>

> Categorised (borrow, fine, reservation, book, system) with unread dot indicator in the header, mark-all-read, and per-item actions.

</details>

---

## 🔐 Security Notes

- Passwords are hashed with **bcrypt** (cost 12)
- JWTs are signed with **HS256**; logout invalidates the token via Redis blacklist
- Rate limiting is applied at the middleware layer (configurable via `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW`)
- All admin routes require both `AuthMiddleware` **and** `AdminMiddleware` — role checked server-side on every request
- CORS, `X-Frame-Options`, `X-Content-Type-Options`, and CSP headers set by both nginx and the Gin middleware
- SQL injection is not possible — GORM uses parameterised queries exclusively

---

## 🤝 Contributing

1. Fork [the repository](https://github.com/biswojit65/Library_Management_System)
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a pull request

Please follow the patterns established in `CLAUDE.md` — especially the response shape convention, the repository layer pattern, and the `AutoMigrate` checklist for new entities.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ using Go, React, and PostgreSQL · [github.com/biswojit65/Library_Management_System](https://github.com/biswojit65/Library_Management_System)

</div>

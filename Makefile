.PHONY: up down build restart logs clean migrate seed help

BACKEND_DIR  := library-management-system-backend
FRONTEND_DIR := library-management-system-frontend
COMPOSE      := docker compose

# ─── Help ────────────────────────────────────────────────────────────────────

help:
	@printf "\nLibrary Management System\n\n"
	@printf "  %-12s %s\n" "make up"      "Start all services (detached)"
	@printf "  %-12s %s\n" "make down"    "Stop all services"
	@printf "  %-12s %s\n" "make build"   "Build all Docker images"
	@printf "  %-12s %s\n" "make restart" "Restart all services"
	@printf "  %-12s %s\n" "make logs"    "Follow logs from all services"
	@printf "  %-12s %s\n" "make clean"   "Stop services, remove volumes and artifacts"
	@printf "  %-12s %s\n" "make migrate" "Run database migrations (auto on startup)"
	@printf "  %-12s %s\n" "make seed"    "Re-seed the database with sample data"
	@printf "\n"

# ─── Core Docker commands ────────────────────────────────────────────────────

up:
	$(COMPOSE) up -d
	@echo ""
	@echo "Services started:"
	@echo "  Frontend  → http://localhost:3000"
	@echo "  Backend   → http://localhost:8080"
	@echo "  Postgres  → localhost:5432"

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

clean:
	$(COMPOSE) down -v --remove-orphans
	docker system prune -f
	@echo "Cleaned up containers, volumes, and dangling images."

# ─── Database ────────────────────────────────────────────────────────────────

migrate:
	@echo "Migrations run automatically when the backend starts."
	@echo "To force a migration cycle, restart the backend:"
	@echo "  docker compose restart backend"

seed:
	@echo "Re-seeding database..."
	$(COMPOSE) exec postgres psql \
		-U $${DB_USER:-library_user} \
		-d $${DB_NAME:-library_db} \
		-f /docker-entrypoint-initdb.d/init.sql 2>/dev/null \
		&& echo "Seed complete." \
		|| echo "Seed skipped (data already present or container not running)."

# ─── Development helpers ─────────────────────────────────────────────────────

dev-backend:
	@echo "Starting backend locally (requires Postgres on localhost:5432)..."
	cd $(BACKEND_DIR) && go run ./cmd/main.go

dev-frontend:
	@echo "Starting frontend dev server..."
	cd $(FRONTEND_DIR) && npm run dev

install:
	@echo "Installing backend dependencies..."
	cd $(BACKEND_DIR) && go mod download
	@echo "Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && npm ci --legacy-peer-deps

test-backend:
	cd $(BACKEND_DIR) && go test -v ./...

test-frontend:
	cd $(FRONTEND_DIR) && npm test -- --watchAll=false

health:
	@echo "Backend:"
	@curl -sf http://localhost:8080/health | python3 -m json.tool 2>/dev/null || echo "  Not responding"
	@echo "\nFrontend:"
	@curl -sf -o /dev/null -w "  HTTP %{http_code}\n" http://localhost:3000 || echo "  Not responding"

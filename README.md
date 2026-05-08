# gamgee
User companion app for workouts

## Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Vite + React + TypeScript           |
| Backend  | FastAPI (Python 3.12)               |
| Database | PostgreSQL 16                       |
| Infra    | Docker Compose                      |

## Project structure

```
gamgee/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py        # FastAPI app entry point
│       ├── database.py    # SQLAlchemy engine / session
│       ├── models.py      # ORM models
│       ├── schemas.py     # Pydantic schemas
│       └── routers/
│           └── items.py   # CRUD routes for /api/items
└── frontend/
    ├── Dockerfile         # multi-stage: dev / builder / production (nginx)
    ├── nginx.conf         # production reverse-proxy config
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        └── App.tsx
```

## Getting started

### With Docker Compose (recommended)

```bash
cp .env.example .env          # adjust credentials if needed
docker compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| API docs | http://localhost:8000/docs |

### Local development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
DATABASE_URL=postgresql://gamgee:gamgee@localhost:5432/gamgee uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
pnpm install
pnpm run dev
```

## API endpoints

| Method | Path              | Description        |
|--------|-------------------|--------------------|
| GET    | /api/items/       | List all items     |
| GET    | /api/items/{id}   | Get single item    |
| POST   | /api/items/       | Create item        |
| PUT    | /api/items/{id}   | Update item        |
| DELETE | /api/items/{id}   | Delete item        |
| GET    | /health           | Health check       |

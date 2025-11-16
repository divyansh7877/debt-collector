# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Collections Strategy Backend and Frontend** application that manages debt collection strategies for users and groups. The system includes:
- FastAPI backend for managing users, groups, and AI-generated collection strategies
- React frontend with Material-UI and Redux for state management
- SQLite database for persistence
- Optional xAI Grok integration for AI-powered strategy generation (falls back to deterministic strategies if API key not present)

## Architecture

### Backend Structure (FastAPI)
- **`main.py`**: FastAPI application entry point with CORS middleware and router registration
- **`app/database.py`**: SQLAlchemy setup with SQLite database (`test.db`)
- **`app/models.py`**: Database models for `User`, `Group`, and `Strategy` entities
- **`app/schemas.py`**: Pydantic schemas for request/response validation
- **`app/crud.py`**: Database operations (create, read, update functions)
- **Routers**:
  - `app/routers_ingestion.py`: File upload (Excel/PDF) and manual user creation
  - `app/routers_users.py`: User/group listing, status updates, analytics
  - `app/routers_strategies.py`: Strategy creation, AI generation, and execution

### Frontend Structure (React + Vite)
- **`frontend/src/App.jsx`**: Main application component with MUI theme
- **`frontend/src/store/store.js`**: Redux store configuration
- **`frontend/src/features/`**: Redux slices for `users` and `strategies`
- **`frontend/src/components/`**: React components (Header, LeftSidebar, MainContent, etc.)
- **`frontend/src/api/client.js`**: Axios client configured for backend at `http://localhost:8000`

### Key Data Models
- **User**: Individual entity with `name`, `details` (JSON with `amount_owed`, `due_date`, etc.), `status` (pending/ongoing/finished)
- **Group**: Collection of users with shared status
- **Strategy**: Timeline-based collection plan with blocks (source, tone, content) for each timing column

### Status Flow
Users/Groups progress through: `pending` → `ongoing` → `finished`

## Development Commands

### Backend (Python/FastAPI)

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Run development server:**
```bash
uvicorn main:app --reload
```
Server runs at `http://localhost:8000`

**Run all tests:**
```bash
pytest
```

**Run specific test:**
```bash
pytest test_app.py::test_root -v
```

**Run tests with output:**
```bash
pytest -s
```

### Frontend (React/Vite)

**Install dependencies:**
```bash
cd frontend && npm install
```

**Run development server:**
```bash
cd frontend && npm run dev
# or
cd frontend && npm start
```
Frontend runs at `http://localhost:3000`

**Build for production:**
```bash
cd frontend && npm run build
```

**Preview production build:**
```bash
cd frontend && npm run preview
```

## Environment Variables

### Optional AI Integration
- `XAI_API_KEY`: API key for xAI Grok (if not set, uses deterministic fallback)
- `XAI_API_BASE_URL`: Base URL for xAI API (default: `https://api.x.ai`)
- `XAI_MODEL`: Model name (default: `grok-beta`)

## Important Patterns

### Database Session Management
All endpoints use FastAPI's dependency injection for database sessions:
```python
db: Session = Depends(get_db)
```
Sessions are automatically committed/closed by `crud.py` functions.

### Owner Polymorphism
Strategies can belong to either a `user` or a `group`:
- Use `owner_type` parameter ("user" or "group") in strategy endpoints
- The `Strategy` model has both `user_id` and `group_id` (one is always null)

### File Ingestion
The `/ingestion/upload` endpoint handles:
- **Excel files** (.xlsx, .xls): Extracts user data from first row (requires "name" column)
- **PDF files** (.pdf): Extracts text into `details["history_text"]`, requires `user_id` param or creates new user

### AI Strategy Generation
The `/strategies/{owner_id}/ai-generate` endpoint:
1. Fetches owner (user/group) details
2. Calls xAI API if `XAI_API_KEY` is set
3. Falls back to deterministic 3-stage strategy (Day 1-7, 8-14, 15-30) if AI unavailable
4. Returns timeline with blocks (source: email/sms/call, tone, content)

### Frontend State Management
Redux slices handle:
- `users`: List of users/groups, selected entity, analytics data
- `strategies`: Active strategy timelines, execution status

API calls are made through Redux async thunks defined in slice files.

## Testing Notes

- `test_app.py` uses FastAPI's `TestClient` for integration tests
- Tests cover: root endpoint, user creation, entity listing, AI strategy generation, and execution
- Tests work without external API keys (fallback strategies are used)
- Database is created in memory or uses `test.db` file

## Database

SQLite database (`test.db`) is created automatically on first run. To reset:
```bash
rm test.db
```
Tables will be recreated on next server start.

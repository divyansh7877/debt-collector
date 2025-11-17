# Collections Strategy Management System

A full-stack application for managing debt collection strategies with AI-powered decision blocks and timeline-based planning. The system helps organizations create, manage, and execute collection strategies for users and groups.

## Features

- **User & Group Management**: Manage individual users and groups with detailed contact information
- **AI-Powered Strategy Generation**: Generate collection strategies using xAI Grok (with deterministic fallback)
- **Decision Blocks**: Add intelligent conditional logic between action blocks
- **Enhanced Contact Details**: Specify exact contact methods (email, phone, SMS) with preferred contact indicators
- **Timeline-Based Planning**: Visual kanban board with 6 timeline stages (Day 1-7 through Day 90+)
- **File Ingestion**: Upload Excel or PDF files to import user data
- **Analytics Dashboard**: View collection status analytics and metrics
- **Strategy Execution**: Track and execute collection strategies

## Tech Stack

### Backend
- **Python 3.x**: Core programming language
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM for database operations
- **Pydantic**: Data validation using Python type annotations
- **Uvicorn**: ASGI server for running FastAPI
- **SQLite**: Lightweight database for data persistence
- **Pandas**: Data manipulation and analysis (for Excel file processing)
- **PyPDF2**: PDF file processing
- **httpx**: HTTP client for API calls (xAI integration)
- **pytest**: Testing framework

### Frontend
- **React 18**: UI library for building user interfaces
- **Vite**: Next-generation frontend build tool
- **Material-UI (MUI)**: React component library for UI design
- **Redux Toolkit**: State management library
- **React Redux**: React bindings for Redux
- **Axios**: HTTP client for API requests
- **React Beautiful DnD**: Drag and drop functionality
- **React Dropzone**: File upload component
- **Recharts**: Charting library for analytics
- **React Router DOM**: Client-side routing
- **date-fns**: Date utility library
- **Lodash**: JavaScript utility library

### Development Tools
- **Conda**: Environment management (using "serve" environment)
- **Git**: Version control

### Optional Integrations
- **xAI Grok API**: AI-powered strategy generation (optional, falls back to deterministic strategies)

## Project Structure

```
serve_collection/
├── app/                          # Backend application
│   ├── __init__.py
│   ├── database.py              # SQLAlchemy database setup
│   ├── models.py                # Database models (User, Group, Strategy)
│   ├── schemas.py               # Pydantic schemas for validation
│   ├── crud.py                  # Database operations
│   ├── routers_ingestion.py     # File upload endpoints
│   ├── routers_users.py         # User/group management endpoints
│   └── routers_strategies.py    # Strategy management endpoints
├── frontend/                     # React frontend application
│   ├── src/
│   │   ├── api/                 # API client and services
│   │   ├── components/          # React components
│   │   ├── features/            # Redux slices
│   │   ├── store/               # Redux store configuration
│   │   ├── App.jsx              # Main app component
│   │   └── main.jsx             # Entry point
│   ├── package.json
│   └── vite.config.js
├── main.py                       # FastAPI application entry point
├── populate_mock_data.py         # Script to populate database with mock data
├── requirements.txt              # Python dependencies
├── test_app.py                   # Backend tests
└── README.md                     # This file
```

## Architecture

### Backend Architecture (FastAPI)
- **RESTful API**: FastAPI-based backend with automatic OpenAPI documentation
- **Database Models**: SQLAlchemy ORM models for User, Group, and Strategy entities
- **Router Pattern**: Modular routing with separate routers for ingestion, users, and strategies
- **Dependency Injection**: FastAPI's dependency system for database sessions
- **CORS Middleware**: Configured for frontend communication

### Frontend Architecture (React + Redux)
- **Component-Based**: Modular React components with Material-UI
- **State Management**: Redux Toolkit for global state (users, strategies)
- **API Layer**: Axios-based API client with Redux async thunks
- **Responsive Design**: Material-UI components with responsive layouts

### Data Models
- **User**: Individual entity with name, details (JSON), status (pending/ongoing/finished), and contact methods
- **Group**: Collection of users with shared status
- **Strategy**: Timeline-based collection plan with action and decision blocks

### Status Flow
Users and Groups progress through: `pending` → `ongoing` → `finished`

## Installation

### Prerequisites
- Python 3.x
- Node.js and npm
- Conda (for environment management)

### Backend Setup

1. Create and activate Conda environment:
```bash
conda create -n serve python=3.x
conda activate serve
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. (Optional) Set environment variables for AI integration:
```bash
export XAI_API_KEY="your-api-key"
export XAI_API_BASE_URL="https://api.x.ai"  # Optional, default value
export XAI_MODEL="grok-beta"  # Optional, default value
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
conda activate serve
uvicorn main:app --reload
```
Backend runs at `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:3000`

### Load Mock Data

To populate the database with sample data:
```bash
rm test.db  # Remove existing database (optional)
conda run -n serve python populate_mock_data.py
```

## Testing

### Backend Tests
```bash
# Run all tests
pytest

# Run specific test
pytest test_app.py::test_root -v

# Run with output
pytest -s
```

### Frontend
The frontend uses Vite's built-in development server with hot module replacement.

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Key Features Explained

### AI Decision Blocks
Add conditional logic between action blocks to create dynamic strategies. Decision blocks evaluate conditions based on user data (payment history, communication logs, etc.) and branch to different outcomes.

### Enhanced Contact Details
Specify exact contact methods (email addresses, phone numbers) for each action block, with support for preferred contact indicators.

### Timeline Stages
The strategy timeline includes 6 stages with color-coded urgency:
- **Day 1-7**: Green (Friendly tone)
- **Day 8-14**: Light Green (Neutral tone)
- **Day 15-30**: Yellow (Firm tone)
- **Day 31-50**: Orange (Firm tone)
- **Day 51-90**: Deep Orange (Escalation tone)
- **Day 90+**: Red (Escalation tone)

## Environment Variables

### Optional AI Integration
- `XAI_API_KEY`: API key for xAI Grok (if not set, uses deterministic fallback)
- `XAI_API_BASE_URL`: Base URL for xAI API (default: `https://api.x.ai`)
- `XAI_MODEL`: Model name (default: `grok-beta`)

## Database

The application uses SQLite (`test.db`) which is created automatically on first run. To reset:
```bash
rm test.db
```
Tables will be recreated on next server start.

## Development Notes

### Database Session Management
All endpoints use FastAPI's dependency injection for database sessions. Sessions are automatically committed/closed by CRUD functions.

### Owner Polymorphism
Strategies can belong to either a `user` or a `group`. Use `owner_type` parameter ("user" or "group") in strategy endpoints.

### File Ingestion
The `/ingestion/upload` endpoint handles:
- **Excel files** (.xlsx, .xls): Extracts user data from first row (requires "name" column)
- **PDF files** (.pdf): Extracts text into `details["history_text"]`, requires `user_id` param or creates new user

## Contributing

1. Ensure you're using the `serve` Conda environment for Python development
2. Follow existing code patterns and structure
3. Write tests for new features
4. Update documentation as needed

## License

[Add your license information here]

## Support

For issues and questions, please refer to the QUICK_START.md guide or check the API documentation at `/docs` when the server is running.


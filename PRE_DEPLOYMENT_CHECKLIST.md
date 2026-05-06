# CKB Tracker - Pre-Deployment Checklist
## Complete Guide for Local Development to Vercel & Supabase Deployment

**Project**: CKB Tracker (Martial Arts Attendance System)  
**Date**: 2026-05-03  
**Location**: `C:\Users\johns\OneDrive\Desktop\projects\rebuild`

---

## Table of Contents
1. [Codebase Assessment Summary](#1-codebase-assessment-summary)
2. [Environment Setup](#2-environment-setup)
3. [Pre-Deployment Checklist](#3-pre-deployment-checklist)
4. [Testing Strategy (Unit & Integration)](#4-testing-strategy-unit--integration)
5. [Security Assessment](#5-security-assessment)
6. [Local Testing Steps](#6-local-testing-steps)
7. [Deployment Steps](#7-deployment-steps)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Troubleshooting](#10-troubleshooting)
11. [Project Cleanup & File Assessment](#11-project-cleanup--file-assessment)

---

## 1. Codebase Assessment Summary

### 1.1 Technology Stack

| Component | Technology | Version | Location |
|-----------|------------|---------|----------|
| **Frontend** | Next.js (React) | 16.1.7 (React 19.2.3) | `ckb-tracker/` |
| **Language** | TypeScript | 5.x | `ckb-tracker/` |
| **Styling** | Tailwind CSS | 4.x | `ckb-tracker/` |
| **Backend** | FastAPI (Python) | - | `backend/` |
| **Database** | SQLite (dev) → PostgreSQL (prod) | 3.x | `backend/app/database.py` |
| **ORM** | SQLAlchemy | - | `backend/app/models.py` |
| **Auth** | JWT + CSRF | Custom implementation | `backend/app/auth/` |
| **UI Components** | Custom + lucide-react | 0.577.0 | `ckb-tracker/src/components/` |
| **State** | React Context | - | `ckb-tracker/src/hooks/` |
| **HTTP Client** | axios | 1.13.6 | `ckb-tracker/src/lib/api.ts` |
| **Charts** | chart.js + react-chartjs-2 | 4.5.1 | `ckb-tracker/src/` |

### 1.2 Project Structure

```
rebuild/
├── ckb-tracker/              # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App Router (login, admin, teacher, portal, check-in)
│   │   ├── components/      # UI components (ui/, layout/, comments/)
│   │   ├── hooks/           # useAuth, useTheme, useChartColors
│   │   ├── lib/             # api.ts, supabase.ts, utils.ts
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── .env.local           # Frontend env vars
│
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── database.py     # SQLAlchemy setup (SQLite currently)
│   │   ├── models.py       # 17 database tables
│   │   ├── schemas.py      # Pydantic validation
│   │   ├── auth/           # JWT, CSRF, rate limiting
│   │   └── routers/        # API endpoints (auth, users, classes, attendance, etc.)
│   ├── run_server.py       # Dev server launcher
│   ├── seed.py             # Demo data
│   └── .env                # Backend env vars
│
└── PRE_DEPLOYMENT_CHECKLIST.md  # This file
```

### 1.3 Database Schema (17 Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (UUID primary keys) |
| `roles` | Role definitions (Student, Teacher, Admin, Tablet) |
| `user_roles` | Many-to-many user-role relationships |
| `gym_locations` | Physical gym locations |
| `class_types` | Class types (Gi, No-Gi, MMA, Open Mat) |
| `classes` | Class schedules (day, time, points) |
| `terms` | Academic terms |
| `term_targets` | Attendance targets per rank |
| `curricula` | Curriculum per class |
| `lessons` | Individual lessons |
| `class_instances` | Specific class sessions |
| `attendance` | Attendance records |
| `class_feedback` | Student feedback |
| `comments` | Comment system |
| `kiosk_auth` | PIN-based kiosk auth |
| `session_tokens` | JWT session tracking |
| `news` | News/announcements |

### 1.4 Critical Findings

**⚠️ Must Fix Before Deployment:**
1. **Database**: Currently SQLite, needs migration to PostgreSQL (Supabase)
2. **Python Dependencies**: No `requirements.txt` - must create before deployment
3. **JWT Secret**: Default secret in code, must change for production
4. **Hardcoded Paths**: `backend/run_server.py` has hardcoded Windows path
5. **Large Components**: `admin/page.tsx` is 1331+ lines, needs refactoring

**✅ Already Configured:**
- Supabase client (though minimally used currently)
- CORS configuration
- CSRF protection
- Rate limiting (slowapi)
- Environment-based config
- TypeScript throughout frontend

---

## 2. Environment Setup

### 2.1 Supabase Project Configuration

#### Create Supabase Project
1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in details:
   - **Name**: `ckb-tracker`
   - **Database Password**: Generate strong password (save securely!)
   - **Region**: Choose closest to users (e.g., `us-east-1`)
4. Wait for provisioning (2-3 minutes)

#### Get Supabase Credentials
After creation, go to **Project Settings > API**:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: `eyJhbGc...` (starts with `eyJ`)
- **service_role key**: (keep secret, never expose to client)

#### Configure Authentication
1. Go to **Authentication > Settings**
2. Enable **Email** provider
3. Configure **URL Configuration**:
   - Site URL: `https://your-vercel-domain.vercel.app`
   - Redirect URLs: Add `http://localhost:3000` for local dev
4. Disable **Confirm email** for development (re-enable for production)

### 2.2 Environment Variables

#### Frontend (`.env.local` in `ckb-tracker/`)

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

#### Backend (`.env` in `backend/`)

```bash
# JWT Secret - GENERATE STRONG RANDOM VALUE FOR PRODUCTION!
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# Database (SQLite for local, Supabase PostgreSQL for production)
DATABASE_URL=sqlite:///./ckb_tracker.db

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Cookie Security
COOKIE_SECURE=False  # Set to True in production

# Token Expiration
ACCESS_TOKEN_EXPIRE_MINUTES=10
REFRESH_TOKEN_EXPIRE_DAYS=7

# Environment
ENVIRONMENT=development

# Allowed Hosts
ALLOWED_HOSTS=localhost,127.0.0.1

# Rate Limiting (optional)
RATE_LIMIT_PER_MINUTE=60
```

### 2.3 Local Development Setup

#### Backend (Python/FastAPI)

```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild\backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy python-dotenv pydantic slowapi python-multipart passlib[bcrypt] supabase

# Create requirements.txt for deployment
pip freeze > requirements.txt

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (Next.js/React)

```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild\ckb-tracker

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
```

---

## 3. Pre-Deployment Checklist

### 3.1 Database Migration (SQLite → Supabase/PostgreSQL)

**CRITICAL**: Current backend uses SQLite. Supabase uses PostgreSQL.

#### Option A: Fresh Start (Recommended)

1. **Create Supabase Tables** - Run this SQL in **Supabase > SQL Editor**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    rank VARCHAR DEFAULT 'White',
    last_graded_date DATE,
    comments TEXT,
    nicknames VARCHAR,
    profile_image_url VARCHAR,
    image_offset_x FLOAT DEFAULT 0.0,
    image_offset_y FLOAT DEFAULT 0.0,
    is_current BOOLEAN DEFAULT TRUE,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    description TEXT
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
('Admin', 'Administrator with full access'),
('Instructor', 'Class instructor'),
('Student', 'Regular student'),
('Tablet', 'Tablet-only user for check-in kiosk');

-- User Roles junction table
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR REFERENCES users(user_uuid),
    role_id INTEGER REFERENCES roles(id),
    is_current BOOLEAN DEFAULT TRUE,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gym Locations table
CREATE TABLE gym_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    address TEXT
);

-- Class Types table
CREATE TABLE class_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);

-- Classes (Class Schedules) table
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    class_uuid VARCHAR UNIQUE DEFAULT uuid_generate_v4()::text,
    class_name VARCHAR NOT NULL,
    day VARCHAR,
    time VARCHAR,
    description TEXT,
    points FLOAT DEFAULT 1.0,
    gym_id INTEGER REFERENCES gym_locations(id),
    class_type_id INTEGER REFERENCES class_types(id),
    is_current BOOLEAN DEFAULT TRUE,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Terms table
CREATE TABLE terms (
    id SERIAL PRIMARY KEY,
    term_name VARCHAR UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Term Targets table
CREATE TABLE term_targets (
    id SERIAL PRIMARY KEY,
    term_id INTEGER REFERENCES terms(id),
    rank VARCHAR NOT NULL,
    target FLOAT NOT NULL
);

-- Curricula table
CREATE TABLE curricula (
    id SERIAL PRIMARY KEY,
    class_id INTEGER UNIQUE REFERENCES classes(id),
    name VARCHAR,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    curriculum_id INTEGER REFERENCES curricula(id),
    title VARCHAR NOT NULL,
    description TEXT,
    lesson_plan_url VARCHAR,
    video_folder_url VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class Instances table
CREATE TABLE class_instances (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    class_date DATE NOT NULL,
    teacher_uuid VARCHAR REFERENCES users(user_uuid),
    lesson_id INTEGER REFERENCES lessons(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR REFERENCES users(user_uuid),
    class_id INTEGER REFERENCES classes(id),
    class_instance_id INTEGER REFERENCES class_instances(id),
    teacher_uuid VARCHAR REFERENCES users(user_uuid),
    user_role_id INTEGER REFERENCES user_roles(id),
    attendance_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR DEFAULT 'confirmed',
    confirmed_by VARCHAR REFERENCES users(user_uuid),
    confirmed_at TIMESTAMP
);

-- Class Feedback table
CREATE TABLE class_feedback (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR REFERENCES users(user_uuid),
    attendance_id INTEGER REFERENCES attendance(id),
    class_instance_id INTEGER REFERENCES class_instances(id),
    rating VARCHAR,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    comment_uuid VARCHAR UNIQUE DEFAULT uuid_generate_v4()::text,
    parent_comment_id INTEGER REFERENCES comments(id),
    author_uuid VARCHAR REFERENCES users(user_uuid),
    target_user_uuid VARCHAR REFERENCES users(user_uuid),
    content TEXT NOT NULL,
    rating VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kiosk Auth table
CREATE TABLE kiosk_auth (
    id SERIAL PRIMARY KEY,
    pin_hash VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session Tokens table
CREATE TABLE session_tokens (
    id SERIAL PRIMARY KEY,
    token_jti VARCHAR UNIQUE NOT NULL,
    user_uuid VARCHAR REFERENCES users(user_uuid),
    token_type VARCHAR,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News table
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uuid ON users(user_uuid);
CREATE INDEX idx_attendance_user_uuid ON attendance(user_uuid);
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_class_instances_class_id ON class_instances(class_id);
CREATE INDEX idx_class_instances_date ON class_instances(class_date);
```

2. **Update Backend Database Connection** (`backend/app/database.py`):

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# For Supabase PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required for production")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

3. **Seed Demo Data** (optional):
```bash
cd backend
python seed.py
```

### 3.2 Build Optimization

#### Frontend (Next.js)

```bash
cd ckb-tracker

# TypeScript check
npx tsc --noEmit

# ESLint check
npm run lint

# Production build test
npm run build

# If build succeeds, test production locally
npm run start
```

**Checklist**:
- [ ] All TypeScript errors resolved
- [ ] All ESLint warnings addressed
- [ ] Production build completes without errors
- [ ] Bundle size analyzed (optional: `@next/bundle-analyzer`)
- [ ] Images optimized (Next.js Image component)
- [ ] Unused dependencies removed

#### Backend (FastAPI)

```bash
cd backend

# Check Python syntax
python -m py_compile app/main.py

# Verify imports
python -c "from app.main import app"

# Test with production settings
ENVIRONMENT=production uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3.3 API Endpoint Verification

Test all backend endpoints locally:

```bash
# Start backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Test endpoints
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/docs  # FastAPI automatic docs

# Test auth
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123", "first_name": "Test", "last_name": "User"}'
```

**Endpoint Checklist**:
- [ ] `GET /` - Root endpoint
- [ ] `POST /auth/register` - Registration
- [ ] `POST /auth/login` - Login
- [ ] `POST /auth/refresh` - Token refresh
- [ ] `GET /users/me` - Current user
- [ ] `GET /users` - List users (admin)
- [ ] `GET /classes` - List classes
- [ ] `GET /class-instances` - Class instances
- [ ] `POST /attendance` - Record attendance
- [ ] `GET /dashboard/stats` - Dashboard stats
- [ ] `GET /news` - News items

### 3.4 Security Checklist

- [ ] **JWT Secret**: Changed to strong random value (generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"`)
- [ ] **CORS Origins**: Restricted to known domains (not `*`)
- [ ] **Environment Variables**: No secrets in code
- [ ] **HTTPS Only**: `COOKIE_SECURE=True` in production
- [ ] **Supabase RLS**: Row Level Security enabled on sensitive tables
- [ ] **Rate Limiting**: Configured (already in code via `slowapi`)
- [ ] **Input Validation**: Using Pydantic schemas
- [ ] **SQL Injection**: Using SQLAlchemy ORM (parameterized queries)
- [ ] **Default PIN**: Change kiosk default PIN from "1234"

### 3.5 Code Quality Improvements

- [ ] Create `backend/requirements.txt` with all Python dependencies
- [ ] Remove hardcoded path in `backend/run_server.py`
- [ ] Refactor `ckb-tracker/src/app/admin/page.tsx` (1331+ lines)
- [ ] Add React error boundaries
- [ ] Add comprehensive loading states
- [ ] **Implement robust testing strategy (see Section 4)**

---

## 4. Testing Strategy (Unit & Integration)

### 4.1 Backend Testing (FastAPI + pytest)

#### Setup Testing Framework

```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild\backend
pip install pytest pytest-cov httpx
```

Create `backend/tests/__init__.py` and `backend/conftest.py`:

**`backend/conftest.py`**:
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.auth.jwt_utils import create_access_token

# Test database (separate from dev)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(test_db):
    app.dependency_overrides[get_db] = lambda: TestingSessionLocal()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    """Generate auth headers for testing protected endpoints"""
    token = create_access_token(user_uuid="test-uuid", role="Admin")
    return {"Authorization": f"Bearer {token}"}
```

#### Unit Tests for Backend

Create `backend/tests/test_auth.py`:
```python
from app.auth.jwt_utils import create_access_token, verify_token
from app.auth.config import JWT_SECRET_KEY

def test_create_access_token():
    token = create_access_token(user_uuid="test-123", role="Student")
    assert token is not None
    assert isinstance(token, str)

def test_verify_valid_token():
    token = create_access_token(user_uuid="test-123", role="Student")
    payload = verify_token(token)
    assert payload["user_uuid"] == "test-123"
    assert payload["role"] == "Student"

def test_verify_invalid_token():
    payload = verify_token("invalid-token")
    assert payload is None
```

Create `backend/tests/test_users.py`:
```python
def test_register_user(client, test_db):
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"

def test_register_duplicate_email(client, test_db):
    # First registration
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    })
    # Duplicate registration
    response = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
        "first_name": "Test2",
        "last_name": "User2"
    })
    assert response.status_code == 400

def test_login_user(client, test_db):
    # Register first
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    })
    # Login
    response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "testpass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

Create `backend/tests/test_attendance.py`:
```python
def test_record_attendance(client, test_db, auth_headers):
    # First create a class and user
    # Then test attendance recording
    response = client.post("/attendance", 
        json={
            "user_uuid": "test-uuid",
            "class_id": 1,
            "class_instance_id": 1
        },
        headers=auth_headers
    )
    assert response.status_code in [200, 201]

def test_get_attendance_records(client, test_db, auth_headers):
    response = client.get("/attendance", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

#### Integration Tests for Backend

Create `backend/tests/test_integration.py`:
```python
def test_full_user_flow(client, test_db):
    """Test complete user registration → login → access protected route flow"""
    # 1. Register
    reg_response = client.post("/auth/register", json={
        "email": "integration@test.com",
        "password": "password123",
        "first_name": "Integration",
        "last_name": "Test"
    })
    assert reg_response.status_code == 201
    
    # 2. Login
    login_response = client.post("/auth/login", data={
        "username": "integration@test.com",
        "password": "password123"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # 3. Access protected route
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/users/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "integration@test.com"

def test_cors_headers(client, test_db):
    """Test CORS headers are properly set"""
    response = client.options("/")
    assert "access-control-allow-origin" in response.headers

def test_rate_limiting(client, test_db):
    """Test rate limiting on auth endpoints"""
    for _ in range(61):  # Exceed rate limit
        response = client.post("/auth/login", data={
            "username": "test@example.com",
            "password": "wrong"
        })
    assert response.status_code == 429  # Too Many Requests
```

#### Run Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Run with detailed output
pytest -v --tb=short
```

**Target Coverage**: ≥ 80% for critical paths (auth, attendance, users)

---

### 4.2 Frontend Testing (Jest + React Testing Library)

#### Setup Testing Framework

```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild\ckb-tracker
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
npm install --save-dev msw  # Mock Service Worker for API mocking
```

Create `ckb-tracker/jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

Create `ckb-tracker/tests/setupTests.ts`:
```typescript
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Next.js env
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
```

#### Unit Tests for Frontend Components

Create `ckb-tracker/tests/components/Button.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

Create `ckb-tracker/tests/components/LoginForm.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/LoginForm';

// Mock the API module
jest.mock('@/lib/api', () => ({
  login: jest.fn(),
}));

describe('LoginForm', () => {
  it('validates required fields', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const mockLogin = require('@/lib/api').login;
    mockLogin.mockResolvedValueOnce({ data: { access_token: 'test-token' } });

    render(<LoginForm />);
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

#### Integration Tests for Frontend

Create `ckb-tracker/tests/integration/auth-flow.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/hooks/useAuth';
import { LoginPage } from '@/app/login/page';

// Mock fetch
global.fetch = jest.fn();

describe('Authentication Flow', () => {
  it('completes login and redirects to dashboard', async () => {
    // Mock successful login API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'test-token',
        user: { email: 'test@example.com', first_name: 'Test' }
      })
    });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify redirect happened (check for dashboard elements)
    expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
  });
});
```

#### API Mocking with MSW (Mock Service Worker)

Create `ckb-tracker/tests/mocks/handlers.ts`:
```typescript
import { rest } from 'msw';

export const handlers = [
  rest.post('http://localhost:8000/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: { email: 'test@example.com' }
      })
    );
  }),

  rest.get('http://localhost:8000/users/me', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      })
    );
  }),

  rest.get('http://localhost:8000/classes', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, class_name: 'Gi Class', day: 'Monday', time: '18:00' }
      ])
    );
  }),
];
```

Create `ckb-tracker/tests/mocks/server.ts`:
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

#### Run Frontend Tests

```bash
cd ckb-tracker

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- LoginForm.test.tsx
```

**Target Coverage**: ≥ 70% for components, ≥ 80% for utilities and hooks

---

### 4.3 End-to-End (E2E) Testing (Optional but Recommended)

#### Setup Playwright or Cypress

```bash
# Option A: Playwright (recommended for Next.js)
cd ckb-tracker
npm init playwright@latest

# Option B: Cypress
npm install --save-dev cypress
```

Create `ckb-tracker/e2e/auth.spec.ts` (Playwright example):
```typescript
import { test, expect } from '@playwright/test';

test('complete user registration and login flow', async ({ page }) => {
  // Go to login page
  await page.goto('http://localhost:3000/login');
  
  // Click register link
  await page.click('text=Register');
  
  // Fill registration form
  await page.fill('[name="email"]', 'e2e@test.com');
  await page.fill('[name="password"]', 'password123');
  await page.fill('[name="firstName"]', 'E2E');
  await page.fill('[name="lastName"]', 'Test');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
});
```

#### Run E2E Tests

```bash
# Start dev servers first
# Terminal 1: cd backend && uvicorn app.main:app --reload
# Terminal 2: cd ckb-tracker && npm run dev

# Then run E2E tests
cd ckb-tracker
npx playwright test
# or
npx cypress run
```

---

### 4.4 Continuous Integration (CI) Setup

Create `.github/workflows/test.yml`:
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: |
          cd ckb-tracker
          npm install
          npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

### 4.5 Testing Checklist

**Backend (FastAPI)**:
- [ ] Testing framework installed (pytest, pytest-cov, httpx)
- [ ] `conftest.py` configured with test database
- [ ] Unit tests for auth utilities (JWT creation/verification)
- [ ] Unit tests for password hashing
- [ ] Integration tests for user registration
- [ ] Integration tests for login/logout flow
- [ ] Integration tests for attendance recording
- [ ] Integration tests for CORS headers
- [ ] Integration tests for rate limiting
- [ ] Test coverage ≥ 80% for critical paths
- [ ] All tests pass: `pytest -v`

**Frontend (Next.js)**:
- [ ] Testing framework installed (Jest, React Testing Library)
- [ ] MSW configured for API mocking
- [ ] Unit tests for UI components (Button, Input, Card)
- [ ] Unit tests for forms (LoginForm, RegisterForm)
- [ ] Unit tests for custom hooks (useAuth, useTheme)
- [ ] Integration tests for auth flow
- [ ] Integration tests for attendance recording
- [ ] Test coverage ≥ 70% for components
- [ ] Test coverage ≥ 80% for utilities/hooks
- [ ] All tests pass: `npm test`

**E2E Testing**:
- [ ] E2E framework installed (Playwright or Cypress)
- [ ] E2E test for user registration → login → dashboard
- [ ] E2E test for attendance recording
- [ ] E2E test for admin functions
- [ ] All E2E tests pass

**CI/CD**:
- [ ] GitHub Actions workflow created
- [ ] Backend tests run on push/PR
- [ ] Frontend tests run on push/PR
- [ ] Coverage reports uploaded to Codecov

---

## 5. Security Assessment

### 5.1 Static Application Security Testing (SAST)

#### Backend Security Scanning

```bash
cd backend

# Install security tools
pip install bandit safety

# Scan for common security issues
bandit -r app/ -f json -o bandit-report.json

# Check for known vulnerabilities in dependencies
safety check -r requirements.txt --json > safety-report.json

# Review reports
cat bandit-report.json
cat safety-report.json
```

**Critical Issues to Check**:
- [ ] Hardcoded secrets/credentials
- [ ] SQL injection vulnerabilities (should be safe with SQLAlchemy ORM)
- [ ] Command injection risks
- [ ] Insecure use of `eval()` or `exec()`
- [ ] Missing input validation
- [ ] Insecure JWT handling

#### Frontend Security Scanning

```bash
cd ckb-tracker

# Check for known vulnerabilities in npm packages
npm audit

# Fix vulnerabilities
npm audit fix

# Or use Snyk for deeper analysis
npm install -g snyk
snyk test
snyk monitor
```

**Critical Issues to Check**:
- [ ] Cross-Site Scripting (XSS) vulnerabilities
- [ ] Cross-Site Request Forgery (CSRF) protection
- [ ] Insecure storage of sensitive data in localStorage/sessionStorage
- [ ] Dependencies with known vulnerabilities

---

### 5.2 Authentication & Authorization Review

#### JWT Implementation Audit

**Check `backend/app/auth/jwt_utils.py`**:
- [ ] JWT secret is loaded from environment variable (not hardcoded)
- [ ] JWT secret is sufficiently complex (≥64 bytes, url-safe)
- [ ] Access token expiration is short (≤15 minutes)
- [ ] Refresh token rotation is implemented
- [ ] JWT signature algorithm is explicitly set (HS256)
- [ ] `jti` (JWT ID) is used for token revocation
- [ ] Tokens are validated on every request

**Generate Secure JWT Secret**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
# Use output as JWT_SECRET_KEY in production
```

#### Password Security Audit

**Check `backend/app/auth/config.py` and password hashing**:
- [ ] Passwords are hashed with bcrypt (not plain text, MD5, or SHA1)
- [ ] bcrypt cost factor is appropriate (≥12)
- [ ] Password complexity requirements enforced (min 8 chars, mixed case, numbers)
- [ ] Passwords are never logged
- [ ] Failed login attempts are rate-limited

#### Role-Based Access Control (RBAC) Audit

**Check all protected endpoints**:
- [ ] Admin endpoints require Admin role
- [ ] Teacher endpoints require Teacher or Admin role
- [ ] Student endpoints require Student, Teacher, or Admin role
- [ ] Kiosk endpoints require Tablet role or special authentication
- [ ] Role checks are performed server-side (not just client-side)
- [ ] User roles are validated on every request

**Example Middleware for Role Checking**:
```python
from fastapi import Depends, HTTPException
from app.auth.jwt_utils import verify_token

def require_role(required_role: str):
    def role_checker(token: str = Depends(oauth2_scheme)):
        payload = verify_token(token)
        user_role = payload.get("role")
        if user_role != required_role and user_role != "Admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return payload
    return role_checker
```

---

### 5.3 CSRF Protection Assessment

**Check `backend/app/auth/csrf.py`**:
- [ ] CSRF tokens are generated for each session
- [ ] CSRF tokens are validated on all state-changing requests (POST, PUT, DELETE)
- [ ] CSRF tokens are not accessible via JavaScript (HttpOnly cookies)
- [ ] CSRF token validation is enforced consistently

**Frontend CSRF Integration**:
- [ ] Axios interceptors add CSRF token to requests
- [ ] CSRF token is fetched on login and stored securely
- [ ] CSRF token is refreshed periodically

---

### 5.4 Database Security Review

#### SQL Injection Prevention

**Check `backend/app/routers/*.py`**:
- [ ] All database queries use SQLAlchemy ORM (parameterized queries)
- [ ] Raw SQL queries use parameterized queries (not f-strings or concatenation)
- [ ] User input is never directly interpolated into SQL

**Example of Safe Query (SQLAlchemy ORM)**:
```python
# SAFE: Using ORM
user = db.query(User).filter(User.email == email).first()

# SAFE: Parameterized raw SQL
result = db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})

# UNSAFE: Never do this!
# user = db.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

#### Supabase Security (PostgreSQL)

After migrating to Supabase:
- [ ] **Row Level Security (RLS)** enabled on sensitive tables:
  - `users` (users can only see/edit their own data)
  - `attendance` (users can only see their own attendance)
  - `comments` (appropriate visibility rules)
- [ ] Database roles are properly configured (no superuser access from app)
- [ ] Connection uses SSL/TLS
- [ ] Database credentials are stored in Vercel environment variables (not in code)

**Enable RLS in Supabase**:
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (user_uuid = auth.uid()::text);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (user_uuid = auth.uid()::text);
```

---

### 5.5 API Security Review

#### Input Validation

**Check all Pydantic schemas in `backend/app/schemas.py`**:
- [ ] All API inputs are validated with Pydantic
- [ ] String lengths are limited
- [ ] Numeric values are bounded
- [ ] Email formats are validated
- [ ] NoSQL/SQL injection patterns are rejected

**Example Schema with Validation**:
```python
from pydantic import BaseModel, validator, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    
    @validator('password')
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
    
    @validator('first_name', 'last_name')
    def name_length(cls, v):
        if len(v) > 50:
            raise ValueError('Name too long')
        return v
```

#### Rate Limiting

**Check `backend/app/auth/limiter.py`**:
- [ ] Rate limiting is applied to authentication endpoints (login, register)
- [ ] Rate limiting is applied to sensitive endpoints (password reset, etc.)
- [ ] Rate limit headers are returned in responses
- [ ] Rate limit is per-IP or per-user (not global)

#### CORS Configuration

**Check `backend/app/main.py`**:
- [ ] CORS is configured with explicit allowed origins (not `*`)
- [ ] Credentials are allowed only from trusted origins
- [ ] CORS headers are properly set

**Production CORS Configuration**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-domain.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

---

### 5.6 Environment & Secret Management

#### Secrets Audit

**Check all environment variables**:
- [ ] `JWT_SECRET_KEY` is a strong random value (≥64 bytes)
- [ ] `DATABASE_URL` contains credentials (should be in Vercel secrets)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to frontend
- [ ] No secrets are hardcoded in source code
- [ ] No secrets are in `.env` files that are committed to Git

**Check `.gitignore`**:
```bash
# Ensure these are in .gitignore
backend/.env
ckb-tracker/.env.local
*.db
*.pyc
__pycache__/
```

#### HTTPS & Secure Cookies

**Check `backend/app/main.py` and auth endpoints**:
- [ ] `COOKIE_SECURE=True` in production (requires HTTPS)
- [ ] Cookies have `HttpOnly` flag set
- [ ] Cookies have `SameSite=Strict` or `Lax` attribute
- [ ] Vercel automatically provides HTTPS (verify in browser)

---

### 5.7 Dependency Security

#### Backend Dependencies

```bash
cd backend

# Generate requirements.txt with versions pinned
pip freeze > requirements.txt

# Check for vulnerabilities
safety check -r requirements.txt

# Update vulnerable packages
pip install --upgrade package-name
```

**Review `requirements.txt`**:
- [ ] All packages have specific versions pinned
- [ ] No packages with known vulnerabilities
- [ ] No unnecessary packages included

#### Frontend Dependencies

```bash
cd ckb-tracker

# Check for vulnerabilities
npm audit

# Update packages
npm update
npm audit fix

# Review package.json
# Ensure no dev dependencies are in production build
```

---

### 5.8 Penetration Testing Checklist

**Manual Testing**:
- [ ] **XSS Test**: Try injecting `<script>alert('XSS')</script>` in input fields
- [ ] **SQL Injection Test**: Try `' OR '1'='1` in login forms
- [ ] **CSRF Test**: Attempt to make state-changing requests without CSRF token
- [ ] **Auth Bypass**: Attempt to access protected routes without JWT
- [ ] **Privilege Escalation**: Attempt to access admin endpoints as student
- [ ] **Rate Limiting**: Verify rate limiting works on auth endpoints
- [ ] **Error Messages**: Ensure they don't reveal sensitive info (stack traces, DB schema)

**Automated Scanning** (Optional):
```bash
# Install OWASP ZAP (for advanced users)
# Run baseline scan against your deployed app
zap-cli quick-scan --self-contained --start-options '-config api.addrs.addr.name=http://localhost -config api.addrs.addr.url=http://localhost' http://your-app-url
```

---

### 5.9 Security Headers Checklist

**Verify Security Headers** (use https://securityheaders.com/):

- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS only)
- [ ] `Content-Security-Policy` (prevents XSS)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

**Add Security Headers in FastAPI**:
```python
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

---

### 5.10 Security Sign-Off Checklist

Before going live, ensure:
- [ ] **SAST scans completed** (bandit for Python, npm audit for JS)
- [ ] **No high/critical vulnerabilities** in dependencies
- [ ] **JWT secret is secure** and stored in environment variables
- [ ] **Password hashing uses bcrypt** with appropriate cost factor
- [ ] **CORS is restricted** to known domains only
- [ ] **CSRF protection is enforced** on all state-changing requests
- [ ] **Rate limiting is configured** on authentication endpoints
- [ ] **Row Level Security (RLS) enabled** in Supabase
- [ ] **HTTPS is enforced** (COOKIE_SECURE=True, HSTS header)
- [ ] **Security headers are set** (X-Frame-Options, CSP, etc.)
- [ ] **Input validation** with Pydantic on all API endpoints
- [ ] **No secrets in source code** or Git history
- [ ] **Error messages don't leak sensitive info**
- [ ] **Role-based access control** enforced server-side
- [ ] **Penetration testing completed** (manual or automated)

---

## 6. Local Testing Steps

### 6.1 Full Stack Integration Test

#### Step 1: Start Backend
```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild\backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
**Verify**: Open `http://127.0.0.1:8000/docs` (Swagger UI)

#### Step 2: Start Frontend
```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild\ckb-tracker
npm run dev
```
**Verify**: Open `http://localhost:3000`

#### Step 3: Test User Flows
1. Open `http://localhost:3000`
2. Register a new user
3. Login with new user
4. Navigate through app (dashboard, classes, attendance)
5. Check browser console (F12) for errors
6. Check Network tab for failed API calls

### 6.2 Test Supabase Connection

Update `ckb-tracker/.env.local` with real Supabase credentials and verify in browser console:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
```

### 6.3 Simulate Production Environment

#### Frontend Production Build Test
```bash
cd ckb-tracker
npm run build
npm run start
# App runs at http://localhost:3000 in production mode
```

#### Backend Production Test
```bash
cd backend
set ENVIRONMENT=production
set DATABASE_URL=<supabase-connection-string>
set COOKIE_SECURE=False  # Still False for localhost
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 7. Deployment Steps

### 7.1 Push Code to Git

```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 7.2 Deploy Backend to Vercel (FastAPI)

**Option A: Vercel Serverless Functions**

1. Create `backend/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app/main.py"
    }
  ]
}
```

2. Ensure `backend/requirements.txt` exists with:
```
fastapi==0.109.0
uvicorn==0.27.0
sqlalchemy==2.0.25
python-dotenv==1.0.0
pydantic==2.5.3
slowapi==0.1.9
python-multipart==0.0.6
passlib[bcrypt]==1.7.4
supabase==2.3.0
```

3. In Vercel dashboard:
   - Create new project
   - Set root directory to `backend`
   - Add environment variables (see Section 2.2)
   - Deploy

**Option B: Railway / Render (Better for long-running backend)**
- **Railway**: https://railway.app
- **Render**: https://render.com

### 7.3 Deploy Frontend to Vercel (Next.js)

1. In Vercel dashboard, create another project
2. Set root directory to `ckb-tracker`
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (your backend URL)
5. Click **"Deploy"**

**Expected Output**:
```
✓ Ready! Deployed to https://ckb-tracker-xyz.vercel.app
```

### 7.4 Update CORS and Environment Variables

After deployment, update:

1. **Backend CORS_ORIGINS**: Add Vercel frontend URL
2. **Supabase Auth Settings**: Update Site URL and Redirect URLs
3. **Frontend API URL**: Update `NEXT_PUBLIC_API_URL` to production backend URL
4. **Redeploy** both frontend and backend after changes

---

## 8. Post-Deployment Verification

### 6.1 Verify Frontend Deployment

1. Open production URL: `https://ckb-tracker-xyz.vercel.app`
2. Test all pages load correctly
3. Check browser console (F12) for errors
4. Verify environment variables load correctly

### 6.2 Verify Backend Deployment

```bash
# Test production backend
curl https://your-backend-url.vercel.app/
# Should return: {"message": "CKB Tracker API is live!"}

# Test API docs
open https://your-backend-url.vercel.app/docs
```

### 6.3 Test Full Stack in Production

**Critical User Flows**:
- [ ] User can register
- [ ] User can login
- [ ] Dashboard loads with data
- [ ] Attendance can be recorded
- [ ] Class schedule displays
- [ ] News items display
- [ ] Profile page loads

**Cross-Browser Testing**:
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Mobile browsers (iOS Safari, Android Chrome)

### 6.4 Monitor for Errors

**Vercel Logs**:
1. Vercel Dashboard > Project > Deployments
2. Click latest deployment
3. View "Functions" tab for serverless logs

**Supabase Logs**:
1. Supabase Dashboard > Project > Logs
2. Monitor database queries
3. Check for connection errors

### 6.5 Performance Verification

**Lighthouse Audit** (Chrome DevTools):
1. Open production site
2. Press F12 > Lighthouse tab
3. Run audit for Performance, Accessibility, Best Practices, SEO

**Target Scores**:
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 80

---

## 9. Rollback Procedures

### 7.1 Frontend Rollback (Vercel)
1. Go to Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click "..." menu > "Promote to Production"

### 7.2 Backend Rollback
- Same as frontend: promote previous deployment in Vercel
- Or redeploy previous Git commit

### 7.3 Database Rollback
- Supabase Dashboard > Database > Backups
- Restore from backup if available
- **Warning**: Database rollbacks can cause data loss!

---

## 10. Troubleshooting

### Issue: CORS Error in Production
**Solution**: Update `CORS_ORIGINS` in backend environment variables to include production frontend URL.

### Issue: Supabase Connection Failed
**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check Supabase project is active
3. Ensure IP is not blocked (Settings > Database > Connection pooling)

### Issue: Build Failed on Vercel
**Solution**:
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test build locally with `npm run build`

### Issue: Environment Variables Not Loading
**Solution**:
1. Redeploy after adding environment variables
2. For Next.js, ensure vars are prefixed with `NEXT_PUBLIC_` to expose to browser
3. Check Vercel dashboard > Settings > Environment Variables

---

## Quick Reference: Deployment Commands

```bash
# ===== BACKEND DEPLOYMENT =====
cd backend
pip freeze > requirements.txt
git add .
git commit -m "Deploy backend"
git push origin main
# Then deploy via Vercel/Railway dashboard

# ===== FRONTEND DEPLOYMENT =====
cd ckb-tracker
npm run build  # Verify build works
git add .
git commit -m "Deploy frontend"
git push origin main
# Then deploy via Vercel dashboard (auto-deploys if connected to Git)

# ===== VERIFY DEPLOYMENT =====
curl https://your-frontend.vercel.app
curl https://your-backend.vercel.app/
```

---

## Security Reminders ⚠️

Before going live:
- [ ] Change all default passwords and keys
- [ ] Enable Supabase Row Level Security (RLS) on sensitive tables
- [ ] Set `COOKIE_SECURE=True` in production
- [ ] Restrict CORS origins to your domain only
- [ ] Remove any test/seed data from production
- [ ] Enable rate limiting (already configured via slowapi)
- [ ] Set up monitoring and alerting (Sentry, etc.)

---

## Final Deployment Checklist

Print this and check off before going live:

- [ ] All environment variables configured in Vercel
- [ ] Supabase database schema created
- [ ] Backend deployed and responding at production URL
- [ ] Frontend deployed and loading at production URL
- [ ] User registration works
- [ ] User login works
- [ ] Dashboard displays data
- [ ] No console errors in browser
- [ ] CORS properly configured
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] Custom domain configured (optional)
- [ ] Supabase RLS enabled
- [ ] Monitoring/Logging set up
- [ ] Team notified of deployment
- [ ] Rollback plan tested

---

## 11. Project Cleanup & File Assessment

### 11.1 Assessment of Unnecessary/Obsolete Files

After reviewing the project structure, the following files should be evaluated for cleanup before deployment:

#### Potentially Obsolete .md Files

| File | Status | Recommendation |
|------|--------|----------------|
| `README.md` | Contains only `# "tracker_app_rebuild"` | **DELETE** - No useful content, replace with proper README |
| `rebuild.md` | Old specification (mentions Streamlit, not current stack) | **DELETE** - Outdated, refers to old tech stack |
| `progress.md` | Progress report (231 lines, somewhat current) | **ARCHIVE** - Move to `docs/archive/` or delete |
| `id-photo-implementation.md` | Implementation plan (62 lines, IN PROGRESS) | **KEEP** if still relevant, otherwise archive |
| `ckb-tracker/README.md` | Next.js default README | **REVIEW** - May need customization |
| `handoff/tasks/*.md` | Agent task files from orchestration | **DELETE** after verification |
| `handoff/results/*.done` | Agent output files | **DELETE** after verification |

#### Temporary/Debug Files (Should Be Deleted)

```bash
# Check for these files in backend/
backend/debug_*.py          # Debug scripts
backend/fix_*.py            # Fix scripts (should be committed fixes)
backend/verify_*.py         # Verification scripts
backend/*.log               # Log files
backend/ckb_tracker.db      # SQLite DB (if migrating to Supabase, backup first)
```

#### Build/Dependency Directories to Verify in .gitignore

| Directory/File | Action |
|----------------|--------|
| `backend/.venv/` | Already in .gitignore - **VERIFY NOT COMMITTED** |
| `backend/Lib/` | Already in .gitignore - **VERIFY NOT COMMITTED** |
| `backend/ckb_tracker.db` | Already in .gitignore - **VERIFY NOT COMMITTED** |
| `ckb-tracker/node_modules/` | Already in .gitignore - **VERIFY NOT COMMITTED** |
| `ckb-tracker/.next/` | Should be in .gitignore - **VERIFY** |
| `ckb-tracker/.secrets/` | Already in .gitignore - **VERIFY NOT COMMITTED** |

---

### 11.2 Cleanup Commands

#### Step 1: Verify .gitignore is Working

```bash
# Check if any ignored files are already committed
git status --ignored

# Check if node_modules is tracked (it shouldn't be)
git ls-files | grep node_modules

# Check if .env files are tracked (they shouldn't be)
git ls-files | grep -E "\.env|\.env\.local"

# If any shouldn't-be-there files are committed, remove them:
git rm --cached <file>
```

#### Step 2: Remove Obsolete Files

```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild

# Backup first (optional)
mkdir backup-docs
cp README.md backup-docs/ 2>/dev/null
cp rebuild.md backup-docs/ 2>/dev/null
cp progress.md backup-docs/ 2>/dev/null
cp id-photo-implementation.md backup-docs/ 2>/dev/null

# Delete obsolete files
rm README.md              # Only says "tracker_app_rebuild"
rm rebuild.md              # Outdated spec (mentions Streamlit)

# Archive progress files (optional - keep for reference)
mkdir -p docs/archive
mv progress.md docs/archive/ 2>/dev/null
mv id-photo-implementation.md docs/archive/ 2>/dev/null

# Remove handoff files from agent tasks (if done)
rm -rf handoff/
```

#### Step 3: Clean Python Cache and Temp Files

```bash
cd C:\Users\johns\OneDrive\Desktop\projects\rebuild

# Remove Python cache files
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
find . -type f -name "*.pyo" -delete 2>/dev/null

# Remove any log files
find . -type f -name "*.log" -delete 2>/dev/null

# Remove any .bat files (from earlier assessment)
find . -type f -name "*.bat" -delete 2>/dev/null

# Clean up any temp files
find . -type f -name "temp.*" -delete 2>/dev/null
find . -type f -name "*.tmp" -delete 2>/dev/null
```

#### Step 4: Verify No Sensitive Data in Git History

```bash
# Check for accidentally committed secrets
git log -p | grep -i "JWT_SECRET\|DATABASE_URL\|SUPABASE.*KEY\|password\|secret"

# If found, use git-filter-repo or BFG Repo-Cleaner to remove from history
# WARNING: This rewrites git history!
```

#### Step 5: Create Proper README.md

```bash
# Create a proper README for the project
cat > README.md << 'EOF'
# CKB Tracker

A martial arts attendance tracking system built with Next.js (frontend) and FastAPI (backend), using Supabase for database and authentication.

## Features

- **User Management**: Students, Teachers, Admins, and Tablet/Kiosk roles
- **Attendance Tracking**: Check-in via kiosk or manual entry
- **Class Scheduling**: Manage class schedules and instances
- **Curriculum Management**: Track lessons and progress
- **Dashboards**: Role-specific dashboards for Students, Teachers, and Admins
- **Reporting**: Attendance analytics and statistics

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Frontend | Next.js 16 (React 19), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), SQLAlchemy ORM |
| Database | PostgreSQL (via Supabase) |
| Auth | JWT + CSRF Protection |
| Deployment | Vercel (Frontend + Backend) |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Supabase account

### Local Development

1. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. **Frontend Setup**:
   ```bash
   cd ckb-tracker
   npm install
   npm run dev
   ```

3. **Environment Variables**:
   - Copy `backend/.env.example` to `backend/.env` and configure
   - Create `ckb-tracker/.env.local` with Supabase credentials

## Deployment

See [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md) for complete deployment guide.

## Project Structure

```
rebuild/
├── ckb-tracker/          # Next.js frontend
├── backend/              # FastAPI backend
├── PRE_DEPLOYMENT_CHECKLIST.md  # Deployment guide
└── README.md
```

## License

[Add your license here]

---

**Generated by Global Orchestrator** - See `PRE_DEPLOYMENT_CHECKLIST.md` for full pre-deployment checklist.
EOF
```

---

### 11.3 Directory Structure Cleanup

#### Verify/Update .gitignore

Ensure `.gitignore` includes all necessary entries:

```bash
cat >> .gitignore << 'EOF'

# Additional safety
*.db-journal
*.sqlite-journal
.DS_Store
Thumbs.db

# IDE files
.vscode/settings.json
.idea/
*.swp
*.swo

# Testing
.coverage
htmlcov/
.pytest_cache/
EOF
```

#### Final Directory Structure (After Cleanup)

```
rebuild/
├── ckb-tracker/              # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App Router
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   └── types/           # TypeScript types
│   ├── public/              # Static assets
│   ├── tests/               # Test files (NEW)
│   ├── .env.local           # Local env (gitignored)
│   ├── package.json
│   └── README.md
│
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # FastAPI entry
│   │   ├── auth/           # Authentication
│   │   ├── routers/        # API routes
│   │   └── models.py       # Database models
│   ├── tests/               # Test files (NEW)
│   ├── .env                 # Local env (gitignored)
│   ├── .env.example         # Example env
│   ├── requirements.txt     # Python dependencies (CREATE THIS)
│   └── seed.py              # Seed data
│
├── docs/                     # Documentation (NEW)
│   └── archive/             # Old progress files
│
├── .gitignore
├── README.md                 # Project README (NEW)
└── PRE_DEPLOYMENT_CHECKLIST.md  # This file
```

---

### 11.4 Cleanup Checklist

**File Cleanup**:
- [ ] Delete `README.md` (only contains `# "tracker_app_rebuild"`)
- [ ] Delete `rebuild.md` (outdated spec with wrong tech stack)
- [ ] Archive or delete `progress.md`
- [ ] Archive or delete `id-photo-implementation.md`
- [ ] Delete `handoff/` directory (agent task files)
- [ ] Remove any `debug_*.py`, `fix_*.py`, `verify_*.py` scripts in backend/
- [ ] Remove `backend/ckb_tracker.db` (if migrating to Supabase, backup first)
- [ ] Clean all `__pycache__` directories
- [ ] Clean all `*.pyc` files
- [ ] Remove any `*.log` files
- [ ] Remove any `*.tmp` or `temp.*` files

**Git Hygiene**:
- [ ] Verify `.gitignore` is working (`git status --ignored`)
- [ ] Ensure `node_modules/` is NOT tracked
- [ ] Ensure `.env` files are NOT tracked
- [ ] Ensure `.venv/` is NOT tracked
- [ ] Ensure `*.db` files are NOT tracked
- [ ] Check git history for accidentally committed secrets
- [ ] Create proper `README.md` for the project

**Documentation**:
- [ ] Create `README.md` with project overview
- [ ] Verify `PRE_DEPLOYMENT_CHECKLIST.md` is up-to-date
- [ ] Move old documentation to `docs/archive/` (don't delete if still useful)
- [ ] Update `ckb-tracker/README.md` if needed

**Final Verification**:
- [ ] Run `git status` - should be clean except intended changes
- [ ] Run `git diff` - review all changes before commit
- [ ] Ensure no sensitive data in any files
- [ ] Test that project still builds after cleanup
- [ ] Commit cleanup changes with message: `"chore: cleanup obsolete files and add project documentation"`

---

### 11.5 Post-Cleanup Steps

After cleanup, verify the project still works:

```bash
# Test backend still starts
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
# Should start without errors

# Test frontend still builds
cd ckb-tracker
npm run build
# Should complete without errors

# Verify .gitignore
git check-ignore backend/.env
# Should return "backend/.env" (meaning it's ignored)

git check-ignore ckb-tracker/node_modules
# Should return path (meaning it's ignored)
```

---

## 12. Mobile Access & Kiosk Mode Implementation

### 12.1 Mobile Access Architecture

The CKB Tracker needs to support multiple mobile access patterns:
- **Student Mobile**: View attendance, check schedules, update profile
- **Teacher Mobile**: Take attendance, view class rosters, add feedback
- **Admin Mobile**: Full admin access on mobile browsers
- **Kiosk/Tablet Mode**: Dedicated check-in interface using the existing "Tablet" role

#### Current State Analysis

From the codebase:
- **Tablet Role Exists**: `backend/app/models.py` defines a "Tablet" role for kiosk auth
- **Kiosk Auth Table**: `backend/app/models.py` has `kiosk_auth` table with PIN-based auth
- **CORS Config**: Currently configured for localhost development, needs production mobile URLs
- **Responsive Design**: Next.js App Router supports responsive layouts via Tailwind CSS

### 12.2 Mobile CORS Configuration

**Critical**: Mobile devices access via different URLs than desktop. Update CORS for mobile access:

#### Update Backend CORS for Mobile/Production

Edit `backend/.env` (production):
```bash
# Production CORS - include mobile access points
CORS_ORIGINS=https://your-vercel-domain.vercel.app,https://your-custom-domain.com,http://192.168.68.118:3000,http://172.20.64.1:3000
```

Update `backend/app/main.py` to support dynamic CORS:
```python
import os

# CORS middleware - configurable via environment
cors_origins = os.getenv(
    "CORS_ORIGINS", 
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
).split(",")

# Add mobile-specific origins if needed
mobile_origins = os.getenv("MOBILE_ORIGINS", "").split(",")
if mobile_origins and mobile_origins[0]:
    cors_origins.extend(mobile_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### 12.3 Mobile Access Strategy: Tablet Role + Check-In Page

**Current Implementation** (Use This):
The system already has a working mobile solution:

1. **Tablet Role**: Users with the "Tablet" role (`backend/app/models.py:158`)
2. **Check-In Page**: `ckb-tracker/src/app/check-in/page.tsx` is the mobile-optimized interface
3. **Authentication**: Standard JWT + CSRF (not PIN-based kiosk)
4. **Features Unlocked by Tablet Role**:
   - Search for students (line 426: `canSearch = isTablet || isAdmin`)
   - Add new members (line 571: `showNewMemberForm`)
   - View all students for check-in
   - 120-second session timeout (line 40: `sessionTimeLeft`)

**Kiosk Auth (Legacy - DO NOT USE)**:
The `kiosk_auth` table and PIN-based system in `backend/app/routers/kiosk.py` is a legacy implementation. The current check-in system uses standard JWT authentication instead. **Do not invest time in kiosk mode** - it's been superseded by the tablet role.

#### Using Tablet Mode for Mobile/Tablet Access

**Setup for Tablet Devices**:
1. Create a user with "Tablet" role in the admin panel
2. Log into `https://your-app.vercel.app/check-in` on the tablet
3. The interface automatically shows tablet mode (line 441: `isTablet ? 'Tablet Mode' : 'Check-In'`)
4. Session expires after 120 seconds of inactivity (auto-logout for security)

**No additional development needed** - the system is already mobile-ready.

### 12.4 Mobile Responsive Design Checklist

**Tailwind CSS Mobile Optimization**:
- [ ] Test all pages at 375px width (iPhone SE) and 414px (iPhone Plus)
- [ ] Ensure touch targets are ≥44px (Tailwind: `min-h-[44px] min-w-[44px]`)
- [ ] Use responsive classes: `md:`, `lg:` prefixes for desktop layouts
- [ ] Navigation: Convert sidebar to bottom tab bar on mobile
- [ ] Forms: Use `inputmode` attribute for mobile keyboards (`tel`, `email`, `numeric`)

**Key Pages to Test on Mobile**:
- [ ] **Login Page** (`/login`) - Large input fields, easy to tap
- [ ] **Dashboard** (`/dashboard`) - Stack panels vertically on mobile
- [ ] **Check-In** (`/check-in`) - Quick tap-to-check-in interface
- [ ] **Class Schedule** (`/classes`) - Swipeable schedule cards
- [ ] **Kiosk Mode** (`/kiosk`) - Full-screen, no browser UI

### 12.5 Progressive Web App (PWA) Setup (Optional but Recommended)

Convert Next.js app to PWA for mobile app-like experience:

```bash
cd ckb-tracker
npm install next-pwa
```

Create `ckb-tracker/next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // Your existing Next.js config
});
```

Create `ckb-tracker/public/manifest.json`:
```json
{
  "name": "CKB Tracker",
  "short_name": "CKB",
  "description": "Martial Arts Attendance Tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 12.6 Mobile Authentication Strategy

#### JWT Token Storage for Mobile

**Problem**: Mobile browsers handle cookies differently than desktop.

**Solution**: Use a hybrid approach:
1. **Web App (PWA)**: Continue using HTTP-only cookies (existing JWT + CSRF)
2. **Mobile Browser**: Same as desktop - cookies work fine
3. **Kiosk Mode**: Use short-lived PIN-based sessions (existing `kiosk_auth` table)

Update `backend/app/auth/jwt_utils.py` to support mobile token refresh:
```python
# Ensure refresh token endpoint works without CSRF for mobile
@app.post("/auth/refresh")
async def refresh_token(request: Request, db: Session = Depends(get_db)):
    # Allow both cookie and header-based auth for mobile
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        # Fallback to Authorization header for mobile apps
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header.split(" ")[1]
    
    # Rest of refresh logic...
```

### 12.7 Mobile Network Considerations

**Offline Support** (Future Enhancement):
- Use Service Workers (via `next-pwa`) for offline caching
- Cache class schedules and user data locally
- Queue attendance records when offline, sync when online

**Mobile API Performance**:
- [ ] Implement pagination on all list endpoints (`/users`, `/attendance`, `/classes`)
- [ ] Use compression middleware on FastAPI: `uvicorn` with `--proxy-headers` flag
- [ ] Optimize images: Use Next.js `Image` component with `quality={75}`

### 12.8 Mobile Access Testing Checklist

**CORS & Network**:
- [ ] Test access from mobile device on same WiFi (use `http://192.168.x.x:3000`)
- [ ] Test access from mobile cellular network (production URL only)
- [ ] Verify CORS headers allow mobile-origin requests
- [ ] Test API calls from mobile browser console

**Functionality**:
- [ ] Login works on mobile browsers (iOS Safari, Android Chrome)
- [ ] Check-in flow works on mobile
- [ ] Kiosk mode works on tablet devices
- [ ] Touch targets are large enough (≥44px)
- [ ] Forms are easy to fill on mobile (correct input types)

**Tablet-Specific**:
- [ ] Login with "Tablet" role works on mobile/tablet
- [ ] Check-in records attendance correctly  
- [ ] Search functionality works (tablet-only feature)
- [ ] Add new member works (tablet-only feature)
- [ ] Session expires after 120 seconds of inactivity
- [ ] Cannot access admin/teacher routes from tablet view
- [ ] Logout button visible and functional (line 444-449)

**PWA (if implemented)**:
- [ ] App can be "installed" on mobile home screen
- [ ] Opens in standalone mode (no browser UI)
- [ ] Offline page shows when no internet
- [ ] Service worker caches critical assets

### 12.9 Mobile Deployment Configuration

**Environment Variables for Mobile**:

Frontend (`ckb-tracker/.env.local` or Vercel dashboard):
```bash
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Backend (Vercel dashboard or `.env`):
```bash
CORS_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
JWT_SECRET_KEY=your-production-secret
COOKIE_SECURE=True
ENVIRONMENT=production
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Mobile PWA Guide**: https://web.dev/progressive-web-apps/
- **Tailwind Responsive Design**: https://tailwindcss.com/docs/responsive-design

---

**Deployment Complete!** 🎉

---

*Document generated by Global Orchestrator using gsd-codebase-mapper and devops agents on 2026-05-03*
*Updated with Mobile Access & Kiosk Mode section on 2026-05-05*

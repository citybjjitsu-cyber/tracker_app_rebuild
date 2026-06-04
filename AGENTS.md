# AGENTS.md - CKB Tracker Development Guide

This file provides guidelines for AI coding agents working in this repository.

## Project Overview

CKB Tracker is a full-stack web application for tracking martial arts class attendance, student progress, and gym management.

- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS v4 (`ckb-tracker/`)
- **Backend**: FastAPI with Python 3.12+, SQLAlchemy, Pydantic v2 (`backend/`)
- **Database**: SQLite (development), configurable for production

## Build & Development Commands

### Frontend (ckb-tracker/)

```bash
cd ckb-tracker

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint

# Install dependencies
npm install
```

### Backend (backend/)

```bash
cd backend

# Run development server with uv
uv run uvicorn app.main:app --reload

# Or use the startup script
./start.bat  # Windows
./start-dev.ps1  # PowerShell

# Install dependencies with uv
uv sync
```

### Running Tests

**No test framework is currently configured.** Neither the frontend nor backend have test files or test runners set up. When adding tests:

- **Frontend**: Use Jest or Vitest with React Testing Library
  - Single test: `npx jest path/to/test.tsx` or `npx vitest run path/to/test.tsx`
- **Backend**: Use pytest
  - Single test: `uv run pytest tests/test_auth.py::test_function -v`

## Code Style Guidelines

### Frontend (TypeScript/React)

**Imports:**
- Use path aliases: `@/*` maps to `./src/*`
- Group imports: React/Next first, then third-party, then local modules
- Example:
  ```typescript
  import { useState } from 'react'
  import { NextPage } from 'next'
  import { z } from 'zod'
  import { Button } from '@/components/ui/Button'
  import { useAuth } from '@/hooks/useAuth'
  ```

**Formatting:**
- ESLint with Next.js core web vitals and TypeScript configs
- Run `npm run lint` to check
- 2-space indentation (default)
- Semicolons required
- Single quotes preferred

**Types:**
- Strict mode enabled in `tsconfig.json`
- Explicit type annotations for function parameters and returns
- Use Zod schemas for form validation
- Define shared types in `src/types/index.ts`

**Naming Conventions:**
- Components: PascalCase (e.g., `CommentCard.tsx`, `useAuth.ts`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- CSS classes: Tailwind utility classes, custom in `globals.css`

**Error Handling:**
- Use try-catch in async functions
- Display user-friendly error messages via state
- Log errors to console in development
- API calls wrapped with error handling in `src/lib/api.ts`

**Component Structure:**
- Use functional components with hooks
- React Hook Form for form state management
- Client components marked with `'use client'` directive
- Server components by default (Next.js 16 App Router)

### Backend (Python/FastAPI)

**Imports:**
- Standard library first, then third-party, then local modules
- Absolute imports from `app` package
- Example:
  ```python
  from fastapi import APIRouter, Depends, HTTPException
  from sqlalchemy.orm import Session
  from app.database import SessionLocal
  from app import models, schemas
  ```

**Formatting:**
- No automated formatter configured (consider adding Black or Ruff)
- 4-space indentation (PEP 8)
- Line length: reasonable limits (79-120 chars)

**Types:**
- Type hints required for function parameters and returns
- Use Pydantic v2 models in `schemas.py` for request/response validation
- SQLAlchemy models in `models.py`
- Use `Optional` and `List` from `typing` module

**Naming Conventions:**
- Functions/variables: snake_case
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: snake_case (e.g., `main.py`, `database.py`)
- Router modules: plural nouns (e.g., `users.py`, `classes.py`)

**Error Handling:**
- Use FastAPI's `HTTPException` with appropriate status codes
- Log errors using Python's `logging` module
- Validate input with Pydantic schemas
- Rate limiting via slowapi on sensitive endpoints

**Database:**
- SQLAlchemy ORM with session management via `get_db()` dependency
- Models defined in `app/models.py`
- Schema validation in `app/schemas.py`
- Use migrations for schema changes (consider Alembic)

## Architecture Patterns

**Frontend:**
- App Router architecture (Next.js 16)
- Server-side rendering by default
- Client-side interactivity with `'use client'`
- API calls through `src/lib/api.ts`
- Supabase for authentication

**Backend:**
- Routers in `app/routers/` for endpoint organization
- Dependency injection via FastAPI's `Depends()`
- JWT authentication with refresh tokens
- CSRF protection for cookie-based auth
- Static file serving for uploads

## Security Notes

- Never commit `.env` files or `.secrets/` directory
- Use `python-jose` for JWT token handling
- Rate limiting enabled on auth endpoints
- Password hashing with bcrypt (passlib)
- CORS configured for specific origins in production

## Kiosk Security Model

The kiosk at `/` is the app landing page with two states:

- **LOCKED** (default): Shows CKB branding + staff sign-in button + news feed. No API calls are made to protected endpoints.
- **UNLOCKED**: Staff has authenticated via email/password. Students can search, enter PIN, and check in.

Key rules:
- All kiosk API endpoints require `Authorization: Bearer <staff_token>` header
- Staff token is stored in JavaScript memory only (a module variable), never in localStorage or cookies
- Idle timer (60s) locks the kiosk and discards the token
- Staff unlock uses `/kiosk/unlock` (email/password, rate-limited)
- Lock uses `/kiosk/lock` (revokes JWT JTI server-side)
- The `/login` route is for full staff access (admin/teacher dashboards) — separate from kiosk unlock

## Git Workflow

- Main branch: `main`
- Feature branches: `feature/description`
- Commit messages: conventional commits recommended (feat:, fix:, refactor:, etc.)
- No pre-commit hooks configured currently

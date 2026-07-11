# CKB Tracker — Deployment Guide for Developers

This document explains how the deployment pipeline works from the moment you write code on your computer to when it's live on the internet. It is written for developers who may be new to CI/CD pipelines.

---

## Quick Start — What You Need to Know

| Step | What happens | Who does it |
|---|---|---|
| 1. Write code on a feature branch | You work in your editor (VS Code, etc.) on a new branch | You |
| 2. Run tests locally before pushing | You run test commands in your terminal to check your work | You |
| 3. Push to GitHub | Your code goes to the remote repository on GitHub | You |
| 4. GitHub runs automated tests | The CI pipeline checks your code for errors and coverage | Automatic |
| 5. Merge to `main` | Your feature branch is merged into the main branch | You (or reviewer) |
| 6. Deploy to production | The CD pipeline sends your code live | Automatic |

---

## 1. Local Development — Writing Code

### The Branching Workflow

Every new feature or bug fix should be done on its own **feature branch**, never directly on `main`.

```bash
# Make sure you're on the latest main
git checkout main
git pull origin main

# Create a new branch for your feature
git checkout -b feature/your-feature-name
```

> **Branch naming convention**: use `feature/description` (e.g., `feature/add-student-search`, `fix/login-error`)

Now write your code in your editor. The project has two main parts:

- **`ckb-tracker/`** — The frontend (website you see in the browser)
- **`backend/`** — The API server (handles data, login, check-ins)

### Running the Project Locally

**Frontend:**
```bash
cd ckb-tracker
npm run dev
```
Opens at `http://localhost:3000`

**Backend:**
```bash
cd backend
uv run uvicorn app.main:app --reload
```
Opens at `http://localhost:8000`

---

## 2. Running Tests Locally — Before You Push

Before pushing your branch to GitHub, you should run the tests to make sure nothing is broken. This saves time and prevents failed builds on GitHub.

### Backend Tests (Python)

```bash
cd backend
uv run pytest tests/ --cov=app --cov-report=term-missing
```

**Requirements to pass:**
- All tests must pass (no failures, no errors)
- Line coverage must be **75% or higher**
- If coverage is below 75%, the pipeline will fail

To see which lines are not covered:
```bash
uv run pytest tests/ --cov=app --cov-report=term-missing --cov-report=html
```
Then open `backend/coverage_html/index.html` in your browser.

### Frontend Tests (TypeScript/React)

```bash
cd ckb-tracker
npm run test -- --coverage
```

**Requirements to pass:**
- All tests must pass
- Coverage thresholds (if any test file drops below these, the pipeline fails):
  - Statements: 65%
  - Branches: 50%
  - Functions: 50%
  - Lines: 65%

To see the coverage report in detail:
```bash
npx vitest run --coverage
```
Then open `ckb-tracker/coverage/index.html` in your browser.

### Writing New Tests

If you add new code, you should add tests for it. The general rule:

- **Backend**: Create test files in `backend/tests/` matching the module you're testing (e.g., `test_users.py` for `app/routers/users.py`)
- **Frontend**: Create test files in `ckb-tracker/src/__tests__/` or alongside your component as `ComponentName.test.tsx`

> **Tip**: If you're unsure how to write a test, look at existing test files in the same directory for examples.

---

## 3. Pushing to GitHub

Once your code is working locally and tests pass:

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add student search by name"

# Push your branch to GitHub
git push origin feature/your-feature-name
```

### What Happens Automatically (CI Pipeline)

As soon as you push, **GitHub Actions** starts running:

1. **Backend tests** — Runs all Python tests with coverage check (75% threshold)
2. **Frontend tests** — Runs all TypeScript tests with coverage check

Both run **in parallel** (at the same time) to save time.

### How to Check Your Pipeline Status

1. Go to your repository on GitHub
2. Click the **"Actions"** tab at the top
3. You'll see a list of workflow runs — the latest one from your push
4. Click on it to see details: which steps passed/failed, test output, coverage percentages

If the pipeline fails, click into the failed step to see the error message. Fix the issue, commit again, and push — the pipeline will re-run automatically.

---

## 4. Creating a Pull Request (PR)

When your feature is complete and the CI pipeline passes on your branch:

1. Go to your repository on GitHub
2. Click **"Pull Requests"** → **"New Pull Request"**
3. Set **base: `main`** and **compare: `feature/your-feature-name`**
4. Add a title and description explaining what your changes do
5. Click **"Create Pull Request"**

The CI pipeline runs again on the PR. This is your final safety check before merging.

### Vercel Preview Deployments

When you create a PR, Vercel automatically creates a **Preview Deployment** — a temporary live version of your frontend changes. You'll see a comment in the PR with a link like:

```
https://ckb-tracker-git-feature-your-feature-name-city-kickboxing.vercel.app
```

This lets you (and reviewers) see your changes in a real browser before they go live.

---

## 5. Merging to Main

Once the PR is reviewed and all CI checks pass:

1. Click **"Merge Pull Request"** on GitHub
2. Choose **"Squash and merge"** (creates one clean commit)
3. Click **"Confirm merge"**

### What Happens Automatically (CD Pipeline)

Merging to `main` triggers the **full deployment pipeline**:

1. **Backend tests** run (same as above)
2. **Frontend tests** run (same as above)
3. **If tests pass:**
   - **Frontend deploy** → Vercel builds and deploys to `https://ckb-tracker.vercel.app`
   - **Backend deploy** → Render is notified and deploys to `https://ckb-tracker-api-dev.onrender.com`

Both deploys happen in parallel. The whole process takes about 2-5 minutes.

### Viewing Your Changes Live

After the pipeline completes:

- **Frontend**: Visit `https://ckb-tracker.vercel.app`
- **Backend API**: Visit `https://ckb-tracker-api-dev.onrender.com/` (should show "CKB Tracker API is live!")

---

## 6. Pipeline Diagram

```
You write code locally
        │
        ▼
  git push to feature branch
        │
        ▼
  ┌─────────────────────────────┐
  │   CI: GitHub Actions         │
  │   ┌──────────────────────┐   │
  │   │ Backend tests        │   │
  │   │ • pytest             │   │
  │   │ • coverage ≥ 75%     │   │
  │   └──────────────────────┘   │
  │   ┌──────────────────────┐   │
  │   │ Frontend tests       │   │
  │   │ • vitest             │   │
  │   │ • coverage thresholds│   │
  │   └──────────────────────┘   │
  └─────────────────────────────┘
        │
        ▼ (all tests pass)
  Merge PR to main
        │
        ▼
  ┌─────────────────────────────┐
  │  CD: Deploy Pipeline         │
  │  ┌──────────────────────┐   │
  │  │ Vercel (frontend)    │   │
  │  │ → ckb-tracker.vercel.│   │
  │  │   app                │   │
  │  └──────────────────────┘   │
  │  ┌──────────────────────┐   │
  │  │ Render (backend)     │   │
  │  │ → ckb-tracker-api-dev│   │
  │  │   .onrender.com      │   │
  │  └──────────────────────┘   │
  └─────────────────────────────┘
        │
        ▼
  Site is live
```

---

## 7. Troubleshooting

### Pipeline keeps failing on coverage

Run tests locally with the coverage report flag to see what's not covered:
- Backend: `uv run pytest tests/ --cov=app --cov-report=term-missing`
- Frontend: `npx vitest run --coverage`

Either add tests for the uncovered code, or if the code is trivial (e.g., a config file), check if it can be excluded in the coverage config.

### Vercel preview deployment not showing

Check the PR comments on GitHub. If there's no Vercel bot comment, the preview deployment may have failed. Check the Vercel dashboard at `https://vercel.com/city-kickboxing/ckb-tracker` for details.

### Render deploy failing

Check the Render dashboard at `https://dashboard.render.com/web/srv-d8ueescm0tmc73a4qr10` for build logs.

### Local tests pass but CI fails

This usually means:
- You forgot to push a file (check `git status`)
- Your local environment differs from CI (e.g., different Node.js or Python version)
- A test relies on environment variables that exist locally but not in CI

Check the CI logs carefully — GitHub Actions shows the exact error message and which test failed.

---

## 8. Quick Reference — Commands

| Task | Command |
|---|---|
| Create feature branch | `git checkout -b feature/name` |
| Run all backend tests | `cd backend && uv run pytest tests/` |
| Run backend tests with coverage | `cd backend && uv run pytest tests/ --cov=app --cov-report=term-missing` |
| Run all frontend tests | `cd ckb-tracker && npm run test` |
| Run frontend tests with coverage | `cd ckb-tracker && npm run test -- --coverage` |
| Push branch | `git push origin feature/name` |
| Merge to main (via PR) | GitHub UI → Merge Pull Request |

---

## 9. Environment URLs

| Service | URL | Purpose |
|---|---|---|
| Frontend (production) | `https://ckb-tracker.vercel.app` | Live site |
| Backend API (dev) | `https://ckb-tracker-api-dev.onrender.com` | API server |
| Vercel dashboard | `https://vercel.com/city-kickboxing/ckb-tracker` | Deploy logs, previews |
| Render dashboard | `https://dashboard.render.com/web/srv-d8ueescm0tmc73a4qr10` | Backend logs, env vars |
| GitHub repo | `https://github.com/citybjjitsu-cyber/tracker_app_rebuild` | Source code, CI logs |

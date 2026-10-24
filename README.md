# UniCampus Lost & Found Management System

A fullstack web application designed for university campuses to report lost belongings, register found items, execute ownership verification workflows, and maintain transparent audit trails.

**Developer**: Abdurezak Anwar  
**Role**: Fullstack Developer  
**INSA CTC ID**: CTC-2844-26  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Prerequisites](#prerequisites)
4. [Method 1: Run with Docker Compose (Recommended)](#method-1-run-with-docker-compose-recommended)
5. [Method 2: Run Locally (Without Docker)](#method-2-run-locally-without-docker)
   - [Database Setup](#1-database-setup)
   - [Backend Setup](#2-backend-setup)
   - [Frontend Setup](#3-frontend-setup)
6. [Method 3: Windows Quick Launcher](#method-3-windows-quick-launcher)
7. [Default User Accounts & Credentials](#default-user-accounts--credentials)
8. [Database Seeding & Reset Scripts](#database-seeding--reset-scripts)
9. [Running Automated Tests](#running-automated-tests)
10. [API Documentation](#api-documentation)

---

## Overview

UniCampus Lost & Found provides a structured, role-based platform for campus communities:
* **Lost & Found Reporting**: Submit detailed listings with locations, dates, categories, and private verification criteria.
* **Double-Blind Verification & Priority Queue**: Compares a claimant's ownership proof against the finder's secret detail with admin oversight and FIFO queue management.
* **Mutual Handover Coordination**: Digital receipt and handshake tracking for verified item returns.
* **Campus Administration**: Centralized moderation, user directory, resolution analytics, and immutable compliance audit logs.

---

## Architecture & Tech Stack

* **Frontend**: React 19, Vite, Vanilla CSS with custom design system
* **Backend**: Python 3.10+, FastAPI, SQLAlchemy 2.0 (Eager loading, ORM)
* **Database**: PostgreSQL 16
* **Authentication**: JWT Bearer tokens with Argon2/Bcrypt hashing and role-based access control (Student / Administrator)
* **Testing**: Pytest, HTTPX TestClient

---

## Prerequisites

Before cloning, ensure you have the following installed depending on your setup method:

* **For Docker**:
  * Docker Desktop or Docker Engine + Docker Compose (v2.0+)
* **For Local Setup**:
  * Git
  * Python 3.10 or higher
  * Node.js 18.x or higher (with npm)
  * PostgreSQL 14 or higher

---

## Method 1: Run with Docker Compose (Recommended)

Docker Compose starts PostgreSQL, the FastAPI backend, and the Vite frontend in synchronized containers, automatically seeding default categories and users.

### 1. Clone the Repository

```bash
git clone https://github.com/sodustus/unicampus_laf.git
cd unicampus_laf
```

### 2. Launch Containers

```bash
docker compose up --build
```

### 3. Access the Application

* **Frontend Web App**: http://localhost:5173
* **Backend REST API**: http://localhost:8000
* **Interactive API Docs (Swagger)**: http://localhost:8000/docs
* **Database**: localhost:5432 (Database: `unicampus_laf`, User: `postgres`, Password: `MySecurePass2026!`)

To stop the containers:
```bash
docker compose down
```

---

## Method 2: Run Locally (Without Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/sodustus/unicampus_laf.git
cd unicampus_laf
```

### 2. Database Setup

Ensure your local PostgreSQL server is running, then create the database:

```sql
CREATE DATABASE unicampus_laf;
```

### 3. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   * **Windows**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\activate
     ```
   * **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   * Copy the example configuration:
     ```bash
     cp .env.example .env
     ```
   * If your PostgreSQL credentials differ from the default (`postgres:MySecurePass2026!`), edit `backend/.env` accordingly:
     ```ini
     DATABASE_URL=postgresql+psycopg://postgres:MySecurePass2026!@localhost:5432/unicampus_laf
     BACKEND_PORT=8000
     BACKEND_HOST=127.0.0.1
     PROJECT_NAME="Campus Lost & Found System"
     ```

5. Seed categories and default demo users:
   ```bash
   python seed_categories.py
   python seed_users.py
   ```

6. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *The backend will be available at `http://127.0.0.1:8000`.*

### 4. Frontend Setup

1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev -- --host
   ```
   *The frontend will be available at `http://localhost:5173`.*

---

## Method 3: Windows Quick Launcher

If you are on Windows and have PostgreSQL running with credentials matching `backend/.env`, you can launch both services and the browser in a single step using the included batch script:

1. Double-click `run_app.bat` in the repository root (or execute it from PowerShell/CMD):
   ```cmd
   .\run_app.bat
   ```
2. The script launches:
   * FastAPI Backend on port 8000
   * React + Vite Frontend on port 5173
   * Default browser opened to `http://localhost:5173`

---

## Default User Accounts & Credentials

The system comes pre-seeded with standardized accounts for demonstration and role-based testing:

| Role | Full Name | Department | Campus Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Campus Administrator | Campus Security & Admin | `admin@campus.edu` | `admin123` |
| **Student** | Abebe Bikila | Computer Science & IT | `abebebikila@campus.edu` | `password123` |
| **Student** | Fatuma Roba | Electrical Engineering | `fatumaroba@campus.edu` | `password123` |
| **Student** | Derartu Tulu | Mechanical Engineering | `derartutulu@campus.edu` | `password123` |
| **Student** | Kenenisa Bekele | Civil Engineering | `kenenisabekele@campus.edu` | `password123` |
| **Student** | Haile Gebrselassie | Business Administration | `hailegebrselassie@campus.edu` | `password123` |

*Note: In the web UI, you can also use the 1-Click Multi-User Logins drawer on the sign-in screen to quickly switch between these accounts during evaluation.*

---

## Database Seeding & Reset Scripts

From the `backend/` directory with your virtual environment activated:

* **Seed Categories**:
  ```bash
  python seed_categories.py
  ```
* **Seed Standard Users**:
  ```bash
  python seed_users.py
  ```
* **Purge Test Clutter & Normalize Database**:
  Removes ephemeral fixture accounts and resets the database strictly to the 6 primary accounts:
  ```bash
  python scripts/normalize_accounts.py
  ```

---

## Running Automated Tests

The backend test suite covers authentication, role authorization, report CRUD, priority queues, anti-theft validation, mutual handovers, recovery audit trails, and privacy boundaries.

From the `backend/` directory:

```bash
pytest -v
```

All 28 tests will execute against your configured database instance with automated teardown.

---

## API Documentation

When the backend is running, interactive OpenAPI documentation is automatically available at:

* **Swagger UI**: http://127.0.0.1:8000/docs
* **ReDoc**: http://127.0.0.1:8000/redoc
* **Health Check**: http://127.0.0.1:8000/health

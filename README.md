# UniCampus Lost & Found Management System

A fullstack web application designed for university campuses to report lost belongings, register found items, execute ownership verification workflows, and maintain transparent audit trails.

**Developer**: Abdurezak Anwar  
**Role**: Solo-Fullstack Developer  
**INSA CTC ID**: CTC-2844-26  

---

## Project Demo Video
Watch the project demo here: [UniCampus Lost & Found Demo Video](https://drive.google.com/file/d/1JUy1xs4X7pcErB9NmmwA08fA8C2R_0l_/view?usp=sharing)

<p align="center">
  <img src="demo_scs/hero.png" alt="Hero Screen" width="32%">
  <img src="demo_scs/main.png" alt="Main Screen" width="32%">
  <img src="demo_scs/admin.png" alt="Admin Screen" width="32%">
</p>
<p align="center">
  <img src="demo_scs/lost.png" alt="Lost Item Screen" width="48%">
  <img src="demo_scs/found.png" alt="Found Item Screen" width="48%">
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
   - [Statement of the Problem](#statement-of-the-problem)
   - [System Objectives](#system-objectives)
   - [System User Roles](#system-user-roles)
   - [Functional Requirements](#functional-requirements)
   - [Non-Functional Requirements](#non-functional-requirements)
   - [Technologies Used & Architectural Rationale](#technologies-used--architectural-rationale)
3. [Prerequisites](#prerequisites)
4. [System Flowchart](#system-flowchart)
5. [Method 1: Run with Docker Compose (Recommended)](#method-1-run-with-docker-compose-recommended)
6. [Method 2: Run Locally (Without Docker)](#method-2-run-locally-without-docker)
   - [Database Setup](#1-database-setup)
   - [Backend Setup](#2-backend-setup)
   - [Frontend Setup](#3-frontend-setup)
7. [Method 3: Windows Quick Launcher](#method-3-windows-quick-launcher)
8. [Default User Accounts & Credentials](#default-user-accounts--credentials)
9. [Database Seeding & Reset Scripts](#database-seeding--reset-scripts)
10. [Running Automated Tests](#running-automated-tests)
11. [API Documentation](#api-documentation)

---

## Overview

UniCampus Lost & Found provides a structured, role-based platform for campus communities:
* **Lost & Found Reporting**: Submit detailed listings with locations, dates, categories, and private verification criteria.
* **Double-Blind Verification & Priority Queue**: Compares a claimant's ownership proof against the finder's secret detail with admin oversight and FIFO queue management.
* **Mutual Handover Coordination**: Digital receipt and handshake tracking for verified item returns.
* **Campus Administration**: Centralized moderation, user directory, resolution analytics, and immutable compliance audit logs.

---

## Architecture & Tech Stack

### Statement of the Problem

Higher education campuses host thousands of students, faculty, and visitors daily across lecture halls, libraries, laboratories, cafeterias, sports facilities, and dormitories. In this dynamic environment, personal belongings—ranging from laptops, mobile phones, and student ID cards to wallets, keys, and vital academic documents—are frequently misplaced. 

Traditional university lost-and-found practices face critical operational and service challenges:

* **Fragmented and Informal Reporting Channels**: Lost items are communicated through uncoordinated social media pages, instant messaging groups (Telegram, WhatsApp), or pinned to physical bulletin boards. Many lost items are never reported centrally, leading to poor recovery rates and administrative chaos.
* **Vulnerability to Impersonation and False Claims**: Conventional notice boards publicly broadcast all details of recovered property (e.g., *"Found a black Dell laptop in Hall B"*). Dishonest individuals can easily impersonate the rightful owner without presenting verifiable evidence, resulting in campus theft and wrongful item release.
* **Lack of Blind Verification Mechanisms**: Traditional setups have no mechanism to withhold identifying attributes (e.g., unique stickers, lockscreen wallpaper, serial numbers, engraved initials, or private bag contents) that only the genuine owner would know before releasing custody.
* **Unregulated Handovers and Lack of Accountability**: Handover meetings are arranged informally with no digital record or identity verification. If an item is mismatched, damaged, or contested, neither the finder, the claimant, nor campus security has a reliable audit trail or resolution protocol.
* **Limited Administrative Oversight and Auditing**: Campus administrators and security staff lack real-time visibility into active lost items, recovery velocity, dispute histories, or long-term resolution metrics required for campus safety compliance.

---

### System Objectives

To overcome these challenges, UniCampus Lost & Found is built upon five foundational objectives:

1. **Centralize Campus Lost & Found Operations**: Provide a unified, searchable, real-time repository for all lost and found property across campus faculties and facilities.
2. **Prevent False Claims via Double-Blind Verification**: Keep identifying secrets hidden from the public and require claimants to submit independent proof details, reviewed and authorized by designated campus administrators.
3. **Establish a Transparent FIFO Priority Queue**: Structure competing claims in an equitable First-In, First-Out queue with automated status locking to eliminate chaotic disputes.
4. **Ensure Mutual Handover Accountability**: Implement a guided physical inspection protocol and digital dual-confirmation handshake with dispute handling and automatic listing reactivation on failed handovers.
5. **Provide Comprehensive Governance and Audit Trails**: Equip campus security with real-time analytics, user access controls, and tamper-proof event logging.

---

### System User Roles

| Role | Key Capabilities & Responsibilities |
| :--- | :--- |
| **Students & Staff (End-Users)** | • Submit detailed **Lost Reports** with locations, timestamps, categories, and descriptions.<br/>• Register **Found Items** with public descriptions and confidential **Secret Verification Details**.<br/>• Search and filter the live campus catalog by category, location, date, and status.<br/>• File ownership claims on found items by answering secret proof criteria.<br/>• Coordinate handover meetings, confirm safe returns, or flag item mismatches/disputes.<br/>• Monitor personal claims and report recovery statuses in their dashboard. |
| **Campus Administrators & Security** | • Access the **Verification Console** to compare claimant proof against finder secrets side-by-side.<br/>• Approve verified claims or reject fraudulent/insufficient submissions with auditor notes.<br/>• Oversee the FIFO claim queue and mediate flagged handover disputes.<br/>• Moderate campus listings (edit, flag, reactivate, or close items).<br/>• Manage user accounts and assign role privileges.<br/>• Monitor campus resolution analytics, recovery rates, and category statistics.<br/>• Inspect immutable, chronological system audit trails for compliance. |

---

### Functional Requirements

The system's core capabilities are divided into six operational modules:

#### 1. User Authentication & Role-Based Access Control (RBAC)
* Secure registration and authentication using institutional credentials.
* Token-based authorization (JWT Bearer) enforcing strict permission boundaries between Students and Administrators.
* Rapid multi-user role switcher for administrative demonstrations and workflow evaluation.

#### 2. Lost & Found Incident Reporting & Catalog Management
* Multi-attribute lost reporting: title, category, campus facility/room, date/time, description, and optional contact info.
* Found item registration with mandatory **Secret Verification Details** (encrypted/stored separately and hidden from public endpoints).
* Dynamic photo upload support and predefined campus location tags (Libraries, Cafeterias, Auditoriums, Dormitories, Laboratories).
* Public catalog search and real-time filtering by listing type (`LOST` vs. `FOUND`), category, location, and date range.
* Status tracking chips: `LOST`, `FOUND`, `CLAIMED`, `RESOLVED`, and `CANCELLED` (with mandatory cancellation reason).

#### 3. Double-Blind Verification & Claim Queue
* Ownership claim submission requiring claimants to articulate the item's private proof without seeing the finder's note.
* First-In, First-Out (FIFO) queue management for multiple concurrent claims on high-value items.
* Automatic listing state locking (`CLAIMED` / `PENDING_HANDOVER`) upon administrative approval to prevent duplicate handovers.

#### 4. Administrative Moderation & Claim Adjudication
* Dual-pane review console comparing the finder's confidential secret detail against the claimant's answer.
* One-click claim approval or rejection with audit feedback recorded in the database.
* Listing moderation tools to edit details, flag suspicious reports, or resolve disputes.

#### 5. Mutual Handover & Safe Return Protocol
* Standardized physical handover and inspection workflow for finder and claimant.
* **Dual-Confirmation Handshake**: Both parties must independently confirm the item's safe return to close the report (`RESOLVED`).
* **Failed Handover Flow**: If the physical inspection reveals a mismatch or dispute, the claim is flagged as `HANDOVER_FAILED`, and the listing is automatically reactivated (`ACTIVE`) for subsequent claimants in the queue.

#### 6. Compliance Audit Trails & Resolution Analytics
* Tamper-proof, immutable event logging capturing every state change, claim submission, approval, rejection, and handover confirmation.
* Executive analytics dashboard featuring:
  * Total items reported vs. recovered.
  * System-wide recovery and resolution rate percentages.
  * Average turnaround time from report to safe return.
  * Category-wise incident distribution charts.

---

### Non-Functional Requirements

* **Security & Data Privacy**: 
  * Strict API-level boundary segregation ensuring confidential proof fields are never exposed in public listing payloads.
  * Passwords hashed using industry-standard **Argon2** and salted **Bcrypt** schemes.
  * Protected REST endpoints secured by signed JWT tokens with expiry validation.
  * Parameterized SQL queries via SQLAlchemy ORM to prevent SQL injection vulnerabilities.
* **Performance & Scalability**:
  * Asynchronous non-blocking I/O with FastAPI, providing sub-millisecond route handling.
  * B-tree indexed database queries on frequently filtered columns (`status`, `category_id`, `created_at`, `user_id`).
  * Optimized single-page application (SPA) client bundle (< 200 KB gzip) with sub-second hot module replacement powered by Vite.
* **Usability & Aesthetic Standards**:
  * Modern Swiss Minimalist aesthetic with a clean monochromatic palette, distinct semantic state badges, and high-contrast typography.
  * Responsive, mobile-first design ensuring seamless usability across smartphones, tablets, and desktop workstations.
  * WCAG AA accessibility compliance with clear visual focus states and descriptive semantic markers.
* **Data Integrity & Auditability**:
  * ACID-compliant relational integrity managed by PostgreSQL 16 with foreign key constraints and cascade rules.
  * Explicit SQLAlchemy 2.0 `selectinload` eager loading preventing N+1 query performance degradation.
* **Maintainability & Testability**:
  * Layered architecture strictly decoupling UI components, API routers, business logic, and database schemas.
  * Complete automated test suite using Pytest and HTTPX TestClient covering all role permissions, lifecycle transitions, and anti-theft rules.

---

### Technologies Used & Architectural Rationale

* **Frontend Layer**:
  * **React 19 & Vite**: Chosen for efficient declarative UI rendering, modular component reusability, and rapid build tooling.
  * **Vanilla CSS (Design Tokens)**: Clean, maintainable design system built with CSS custom properties—delivering bespoke typography, responsive layouts, and zero-runtime CSS overhead.
  * **Lucide React Icons**: Consistent, high-clarity SVG iconography for intuitive navigation.
* **Backend Layer**:
  * **Python 3.10+ & FastAPI**: High-performance asynchronous web framework providing automatic OpenAPI (Swagger) documentation, dependency injection, and native type hinting.
  * **Pydantic v2**: High-speed data parsing and validation ensuring all API inputs and outputs strictly adhere to defined schemas.
  * **SQLAlchemy 2.0 ORM**: Modern, type-safe database toolkit facilitating clean object-relational mapping, relationship management, and transactional integrity.
* **Database & Persistence**:
  * **PostgreSQL 16**: Robust, enterprise-ready relational database offering reliable concurrency control, relational constraints, and scalable indexing.
* **Authentication & Quality Assurance**:
  * **PyJWT & Passlib**: Robust cryptographic credential verification and stateless session handling.
  * **Pytest & HTTPX TestClient**: Comprehensive automated testing framework validating all business rules, edge cases, and role restrictions.

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

## System Flowchart

```mermaid
flowchart LR
    classDef startNode fill:#F1F5F9,stroke:#94A3B8,stroke-width:2px,color:#334155;
    classDef decision fill:#FEF3C7,stroke:#F59E0B,stroke-width:2px,color:#92400E;
    classDef lostFlow fill:#DBEAFE,stroke:#3B82F6,stroke-width:2px,color:#1E3A8A;
    classDef foundFlow fill:#DCFCE7,stroke:#22C55E,stroke-width:2px,color:#166534;
    classDef claimFlow fill:#F3E8FF,stroke:#A855F7,stroke-width:2px,color:#6B21A8;
    classDef rejectFlow fill:#FFE4E6,stroke:#F43F5E,stroke-width:2px,color:#9F1239;
    classDef terminalNode fill:#1E293B,stroke:#0F172A,stroke-width:2px,color:#FFFFFF;

    START(["Start"]):::startNode
    D_EVENT{"What happened?"}:::decision

    LOST_POST["User Posts<br/>Lost Report"]:::lostFlow
    LOST_LIST["Listing appears<br/>as LOST"]:::lostFlow
    D_NEXT{"What happens<br/>next?"}:::decision

    OWNER_REC["Owner Marks<br/>as Recovered"]:::foundFlow
    OWNER_DEL["Owner Deletes<br/>with Reason"]:::rejectFlow

    FOUND_POST["User Posts<br/>Found Report"]:::foundFlow
    FOUND_LIST["Listing appears<br/>as FOUND"]:::foundFlow

    CLAIM_SUBMIT["Owner Submits Claim<br/>with Secret Proof"]:::claimFlow
    D_ADMIN{"Admin Reviews<br/>Secret Proof"}:::decision
    CLAIM_REJ["Claim Rejected"]:::rejectFlow
    CLAIM_APP["Claim Approved"]:::foundFlow

    MEETING["Physical Inspection<br/>& Handover Meeting"]:::foundFlow
    CONFIRM["Both Confirm<br/>Safe Return"]:::foundFlow
    HANDOVER_FAIL["Handover Failed<br/>(Mismatch Flagged)"]:::rejectFlow

    END_CLOSED(["Item Recovered<br/>/ Closed"]):::terminalNode

    START --> D_EVENT

    D_EVENT -- "Lost an item" --> LOST_POST
    LOST_POST --> LOST_LIST
    LOST_LIST --> D_NEXT

    D_EVENT -- "Found an item" --> FOUND_POST
    FOUND_POST --> FOUND_LIST

    D_NEXT -- "Owner finds it alone" --> OWNER_REC
    D_NEXT -- "Owner cancels" --> OWNER_DEL
    D_NEXT -- "Match Found" --> CLAIM_SUBMIT

    OWNER_REC --> END_CLOSED
    OWNER_DEL --> END_CLOSED

    FOUND_LIST -- "Claim item" --> CLAIM_SUBMIT
    CLAIM_SUBMIT --> D_ADMIN

    D_ADMIN -- "Proof Fails" --> CLAIM_REJ
    CLAIM_REJ -.-> FOUND_LIST

    D_ADMIN -- "Proof Matches" --> CLAIM_APP
    CLAIM_APP --> MEETING

    MEETING -- "Item verified" --> CONFIRM
    CONFIRM --> END_CLOSED

    MEETING -- "Mismatch / Dispute" --> HANDOVER_FAIL
    HANDOVER_FAIL -. "Listing reactivated<br/>for other claimants" .-> FOUND_LIST
```

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

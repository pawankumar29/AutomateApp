# 🚀 AI-Powered Multi-Platform Job Application Automation SaaS

> **Automated Job Applications across LinkedIn, Naukri.com, and Indeed with Continuous 5-Minute Monitoring, AI Resume Matching (70%+ Threshold), Strict Date-Descending Order, and One-Application-Per-Company Enforcement.**

---

## ⚡ Quick Start — Sirf Ek Command

**Haan! Sirf ek command se pura system start ho jata hai:**

```bash
docker compose up --build -d
```

Aapko PostgreSQL, Redis, ya Node.js manually install karne ki koi zarurat nahi hai. Docker automatically sabhi containers build karega, database migrations chalayega, aur saari services ko start kar dega.

---

## 🌐 Kaunsi Service Kis Port Par Chalegi?

| Service | Port | URL / Endpoint | Kaam / Details |
|---|---|---|---|
| **Frontend Web Dashboard** | `3000` | [http://localhost:3000](http://localhost:3000) | Modern React 18 + Tailwind SaaS UI (Registration, Resume Upload, History, Control Center) |
| **Backend REST API** | `5000` | [http://localhost:5000/api](http://localhost:5000/api) | Express + TypeScript API server (Auth, Profile, Jobs, Matching Engine, Dashboard Metrics) |
| **Backend Health Check** | `5000` | [http://localhost:5000/api/health](http://localhost:5000/api/health) | API status aur health verify karne ke liye endpoint |
| **PostgreSQL Database** | `5432` | `localhost:5432` | Database container (Auto-migrates tables, persistent volume `pgdata`) |
| **Redis Queue Broker** | `6379` | `localhost:6379` | Task queues, rate limits, aur background workers ke liye broker (Volume `redisdata`) |
| **Automation Microservice** | `8000` | [http://localhost:8000/health](http://localhost:8000/health) | Playwright Chromium automation engine (LinkedIn, Naukri, Indeed stealth bots) |
| **BullMQ Background Worker** | *Internal* | *Auto-connected to Redis & DB* | 5-minute continuous monitoring cycle aur submission pipeline run karta hai |

---

## 📋 Step-by-Step Testing & Setup Guide

### Step 1: System Start Karein
Apne project folder me terminal ya PowerShell open karein aur run karein:
```bash
docker compose up --build -d
```
Container status check karne ke liye:
```bash
docker compose ps
```
Sabhi 6 services (`job_saas_frontend`, `job_saas_backend`, `job_saas_worker`, `job_saas_automation`, `job_saas_postgres`, `job_saas_redis`) **Up/Healthy** dikhai dengi.

---

### Step 2: Dashboard Open Karein
Apne browser me open karein:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Step 3: Account Register & Onboarding
1. **"Create an Account"** par click karein aur apna name, email, phone aur password daalkar register karein.
2. 2-step **Onboarding** complete karein (Location, Experience, Expected Salary, Target Job Titles).
3. Aap sidhe **Mission Control Dashboard** par pahunch jayenge.

---

### Step 4: Resume Upload & AI Parsing (70%+ Match ke liye)
1. Left sidebar se **"Resume Management"** (`/resumes`) page par jayein.
2. Apna **PDF** ya **DOCX** resume drag & drop / upload karein.
3. AI parser automatically aapke:
   - Technical skills (Python, React, Node.js, SQL, etc.)
   - Total experience years
   - Education aur details extract karke save kar lega.
4. "Star" icon par click karke isko **Primary Resume** mark karein.

---

### Step 5: 5-Minute Continuous Monitoring Start Karein
1. Left sidebar se **"Control Center"** (`/automation`) page par jayein.
2. **"Start 5-Min Monitoring"** button par click karein.
3. **Bot automatically background me:**
   - Har 5 minute me LinkedIn, Naukri, aur Indeed se latest jobs fetch karega.
   - Jobs ko **Strict Date Descending Order (Newest First)** me sort karega.
   - Aapke resume ke sath compare karke **70%+ skill match** aur experience check karega.
   - **One-Company-One-Application Rule** enforce karega (ek company me multiple jobs par apply nahi karega).
   - Eligible jobs par Easy Apply complete karega.
4. Niche **Live Execution Log Stream** me aap real-time logs scroll hote hue dekh sakte hain.

---

### Step 6: Application History & CSV Export
1. Left sidebar se **"Application History"** (`/history`) page par jayein.
2. Har job ka status (`SUBMITTED`, `QUEUED`, `SKIPPED`, `NEEDS_ATTENTION`, `FAILED`) match percentage ke sath dikhega.
3. **"Export to CSV"** par click karke puri application report download kar sakte hain.

---

## 🛠️ Useful Docker Commands

### Logs Live Dekhne ke liye:
```bash
# Sabhi services ke live logs dekhne ke liye:
docker compose logs -f

# Sirf Backend ke logs dekhne ke liye:
docker compose logs -f backend

# Sirf Automation Worker ke logs dekhne ke liye:
docker compose logs -f worker
```

### System Ko Stop Karne ke liye:
```bash
docker compose down
```

### System Ko Restart Karne ke liye:
```bash
docker compose restart
```

---

## 💻 Alternative: Direct CLI Mode (Without Docker)

Agar aapko Docker ke bina direct Python terminal me chalana ho:

```bash
# 5-minute continuous monitoring cycle terminal me chalane ke liye:
python main.py --monitor --interval 5

# Interactive menu se chalane ke liye:
python main.py

# Visual Demo dekhne ke liye (browser open hote dekhna bina login):
python demo.py
```

---

## 🧪 Automated Test Suite Verify Karna

Pura testing code already written aur verified hai:

```bash
# Python Core Tests (Date parsing, 70% matching, deduplication):
python test_suite.py

# Backend TypeScript Tests:
cd backend
npx tsx test/run-tests.ts
```

Dono test suites **100% Pass** hain!

# 🚀 Autonomous Multi-Platform Job Application SaaS

> **Production-Grade Automated Job Application System across LinkedIn, Naukri.com, and Indeed.**  
> Features 5-minute continuous background monitoring, AI resume parsing, 70%+ skill matching, strict date-descending discovery, and 1-application-per-company rate enforcement.

---

## ⚡ 1. Daily Quick Start (Kal ke liye Guide)

Aapko daily kuch bhi manual karne ki zaroorat nahi hai. System automatically background me chalta hai:

### Agar aap laptop/PC shut down karte hain:
1. **Docker Desktop** open karein.
2. Terminal / PowerShell me command run karein:
   ```powershell
   docker compose up -d
   ```
3. **Bas chhod dein!** Database me automation session **`RUNNING`** state me hai. Background worker automatically 5 minute ke interval par LinkedIn aur Naukri par new matching jobs search karke apply karna shuru kar dega.

### Live Dashboard Access:
👉 **[http://localhost:3000](http://localhost:3000)**  
- **Email:** `pk2027317@gmail.com`
- **Password:** `Password@123`

---

## 👥 2. Naya User Aaye Toh Kaise Connect Hoga? (Complete Steps)

Jab bhi koi naya user platform use karega, uska account aur platform sessions **100% isolated** rahenge.

### Step 1: Account Register Karein
1. Browser me open karein: **[http://localhost:3000/register](http://localhost:3000/register)**
2. Name, Email aur Password daalkar sign up karein.
3. Desired Job Title, Location, Notice Period aur Expected CTC set karein.

### Step 2: Resume Upload Karein
1. Left sidebar se **"Resume Management"** (`/resumes`) par jayein.
2. Naya PDF resume upload karein aur usko **Primary** mark karein.
3. System automatically skills aur experience parse kar lega (70%+ matching threshold ke liye).

### Step 3: Platform Connect Karein (1-Click Sync Login)
Kyunki LinkedIn aur Naukri par OTP aur security bot checks hote hain, platform ko connect karne ke liye project directory me terminal open karke yeh run karein:

```powershell
python sync_login.py
```

#### Kaise kaam karta hai:
1. Script aapse naye user ka **Email** poochhegi (e.g., `user@example.com`).
2. Platform select karein:
   - `[1]` LinkedIn
   - `[2]` Naukri
   - `[3]` Indeed
   - `[4]` All Platforms
3. Screen par **Google Chrome window** khulegi. User apna login / OTP submit karega.
4. **Login hote hi script automatically:**
   - Real session cookies aur persistent profile capture karegi.
   - Session ko Docker PostgreSQL database me us specific user ke sath link kar degi.
5. Ab us naye user ki automation 100% ready ho gayi!

---

## 🌐 3. Services & Port Mapping

| Service | Port | URL / Endpoint | Details |
|---|---|---|---|
| **Frontend Web Dashboard** | `3000` | [http://localhost:3000](http://localhost:3000) | React 18 + Tailwind SaaS UI (Applications, History, Analytics) |
| **Backend API** | `5000` | [http://localhost:5000/api](http://localhost:5000/api) | Express + TypeScript REST API (Auth, Deduplication, Multi-tenant DB) |
| **Automation Microservice** | `8000` | [http://localhost:8000/health](http://localhost:8000/health) | Playwright Chromium automation engine with stealth drivers |
| **PostgreSQL Database** | `5432` | `localhost:5432` | Multi-tenant schema (`users`, `resumes`, `jobs`, `applications`) |
| **Redis Broker** | `6379` | `localhost:6379` | BullMQ queues with rate-limiting & exponential backoff |
| **BullMQ Worker** | *Internal* | *Auto-connected to Redis* | Concurrency=1 worker with humane cool-down delays |

---

## 🤖 4. Platform Automation Coverage & Safety

### 💼 LinkedIn (100% Fully Automated)
- **Target:** Easy Apply listings (`f_AL=true`).
- **Form Filler:** Candidate details, experience years/months, CTC in INR, notice period in days, and screening questions auto-fill hote hain.
- **Verification:** Applications live LinkedIn Job Tracker me **`Applied`** badge ke sath reflect hoti hain.

### 🔵 Naukri (100% Fully Automated)
- **Target:** 1-Click FastForward / Apply listings & Questionnaire Drawers.
- **Chatbot / Modal Handling:** In-page questionnaires automatically affirmative defaults ("Yes") aur profile data se submit hoti hain.
- **Verification:** Naukri portal par job status directly **`Applied`** show hota hai.

### 🟡 Indeed (Smart Apply & Safety Handling)
- **Status:** Direct Apply listings auto-submit hoti hain.
- **Google Enterprise reCAPTCHA Safety:** Jin Indeed jobs ke review step par Google reCAPTCHA pop up hota hai, bot security aur account ban se bachne ke liye system unhe fake-bypass karne ki jagah gracefully **`NEEDS_ATTENTION`** mark karta hai taaki aapka account 100% safe rahe.

---

## 📜 5. Core Rules Enforced

- **Rule A (Strict Date Sorting):** Sabhi discovered jobs newest-first (descending date) order me sort hoti hain taaki fresh openings par pehle apply ho.
- **Rule B (One Company = One Application):** Ek cycle me ek company ki sirf ek relevant job par apply hota hai taaki spamming na ho.
- **Rule C (Strict Deduplication):** Application ledger database me pehle se applied URL ya job ID ko dubara apply karne se rokti hai.
- **Rule D (70%+ Skill Match):** Sirf wahi jobs queue me aati hain jinka match score candidate ke resume ke sath 70% ya usse zyada ho.

---

## 🛠️ Useful Commands

```powershell
# Containers start karna:
docker compose up -d

# Containers stop karna:
docker compose down

# Live worker logs dekhna:
docker compose logs -f worker

# 1-Click Platform Authentication Sync:
python sync_login.py
```

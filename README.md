# Skylark BI Agent

A Conversational Business Intelligence Agent built for the Skylark Drones technical assignment. This application allows founders and executives to ask natural-language business questions about their company data stored in Monday.com.

## 🏗️ Architecture Overview

This application is built with a modern, decoupled client-server architecture.

### **1. Frontend (Client)**
* **Tech Stack:** React 18, Vite, Tailwind CSS (v4)
* **Purpose:** Provides a responsive, premium user interface for the AI chat agent and dashboard.
* **Key Features:**
  * JWT-based authentication flow (Signup/Login).
  * Dashboard to verify Monday.com connection status.
  * Real-time chat interface with Markdown rendering.
  * Designed with modern aesthetics (glassmorphism, subtle animations).

### **2. Backend (Server)**
* **Tech Stack:** Node.js, Express.js, `sql.js` (Pure JS SQLite)
* **Purpose:** Handles API requests, coordinates with third-party services, and runs analytics.
* **Key Components:**
  * **Auth Service (`authController.js`):** Manages user registration and login using SQLite for persistence and JWT for session management.
  * **Monday.com Service (`mondayService.js`):** Integrates directly with the Monday.com GraphQL API to fetch Boards, Columns, and Items using a static Personal Access Token.
  * **Data Normalizer (`normalizer.js`):** Cleans messy real-world data on-the-fly (handling missing values, standardizing sectors like "Energy" to "Renewables", calculating percentages).
  * **Analytics Engine:** Processes the cleaned data deterministically (server-side math) to calculate exact pipeline values, win rates, active work orders, billing, and receivables.

### **3. AI Layer**
* **Model:** Google Gemini (`gemini-3.6-flash` via `@google/genai` SDK)
* **Workflow:**
  1. **Query Understanding:** The AI first parses the user's natural language question and outputs a structured JSON "Query Plan" (identifying the intent, required boards, and specific metrics needed).
  2. **Data Processing:** The backend executes the query plan against the normalized Monday.com data to generate exact numerical metrics. **(The AI never performs math).**
  3. **Response Generation:** The AI takes the calculated metrics and drafts a concise, executive-level business summary.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* Node.js (v18+)
* A Monday.com account (with a Personal Access Token)
* A Google Gemini API Key

### 1. Environment Setup
Create a `.env` file in the `backend` directory based on `backend/.env.example`:
```env
PORT=3001
JWT_SECRET=your-secret
MONDAY_API_TOKEN=your-monday-personal-access-token
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:5173
DB_PATH=./data/skylark.db
```

### 2. Start the Backend
```bash
cd backend
npm install
node src/app.js
```

### 3. Start the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## 🛠️ Design Decisions & Simplifications

* **Database Choice:** `sql.js` (WebAssembly SQLite) is used instead of native `sqlite3` or `better-sqlite3` to ensure the backend can run instantly on any machine (Windows/Mac/Linux) without requiring native C++ build tools or Python installations.
* **Monday.com Auth:** For the sake of simplicity and ease of testing, the complex OAuth 2.0 flow was replaced with a simple global Server-Side API Token. The backend uses one configured Monday.com token to fetch data for the application.
* **LLM Choice:** Google Gemini 3.6 Flash was chosen for its massive context window, high speed, and excellent structured JSON output capabilities.

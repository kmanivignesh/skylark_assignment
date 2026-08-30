# Skylark Insight

A Conversational Business Intelligence Agent built for the Skylark Drones technical assignment. This application allows founders and executives to ask natural-language business questions about their company data stored directly in Monday.com.

---

## 1. Project Overview
Skylark Insight bridges the gap between raw, messy operational data and high-level executive decision-making. Instead of manually exporting CSVs and running pivot tables, executives can chat with an AI agent that understands the business context.

The application dynamically pulls live data from Monday.com (Deals and Work Orders boards), normalizes missing or messy fields on the fly, runs deterministic calculations server-side, and uses an LLM to explain the resulting metrics in clear, founder-friendly language.

---

## 2. Architecture
The application is built using a decoupled Client-Server architecture to ensure scalability and security.

### Frontend (Client)
* **Tech Stack:** React 18, Vite, Tailwind CSS (v4)
* **Purpose:** Provides a premium, responsive UI for authentication, connection management, and the AI chat interface.

### Backend (Server)
* **Tech Stack:** Node.js, Express.js, `sql.js` (SQLite)
* **Purpose:** Acts as the secure orchestration layer. It handles user authentication (JWT), proxies and caches requests to Monday.com, cleans data, performs mathematical aggregations, and communicates with the Google Gemini API.

---

## 3. How the AI Agent Works
We utilize a **Deterministic Math + LLM Translation** pattern to prevent AI hallucinations with financial data.

1. **Query Understanding (LLM):** The user asks a question. The AI analyzes the intent and generates a strict JSON "Query Plan" (e.g., indicating we need the pipeline value for the 'Renewables' sector).
2. **Data Fetching (Backend):** The backend reads the query plan and fetches the necessary raw data from Monday.com (via cache if available).
3. **Data Cleaning (Backend):** The `normalizer.js` utility cleans the data (parsing currencies, mapping strings, handling blanks).
4. **Analytics Engine (Backend):** The backend performs pure, deterministic JavaScript math to calculate exact values (e.g., Win Rate, Total Pipeline). *The AI never does math.*
5. **Response Generation (LLM):** The calculated numerical metrics are fed back to the AI. The AI translates these hard numbers into a concise, well-formatted business summary.

---

## 4. Setup & Installation (Local Development)

### Prerequisites
* Node.js (v18+)
* A Monday.com Personal Access Token
* A Google Gemini API Key

### Step-by-Step
1. Clone the repository.
2. Open a terminal and start the backend:
   ```bash
   cd backend
   npm install
   node src/app.js
   ```
3. Open a second terminal and start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Navigate to `http://localhost:5173` in your browser.

---

## 5. Environment Variables
You must create a `.env` file inside the `/backend` directory:

```env
PORT=3001
JWT_SECRET=your-secure-jwt-secret
MONDAY_API_TOKEN=your-monday-personal-access-token
GEMINI_API_KEY=your-google-gemini-api-key
FRONTEND_URL=http://localhost:5173
DB_PATH=./data/skylark.db
```

---

## 6. Monday.com Configuration
To simplify the user experience, this application uses a global Server-Side API token rather than forcing every user through an OAuth 2.0 flow.

**How to configure:**
1. Log into your Monday.com workspace.
2. Ensure you have two boards set up containing your imported Excel data (the app automatically identifies which is "Deals" and which is "Work Orders" based on column names).
3. Click your Profile Picture (bottom left) -> **Developers**.
4. Go to **My Access Tokens** (or generate a Personal Access Token).
5. Copy the token and set it as `MONDAY_API_TOKEN` in your `.env` file.

---

## 7. Data Cleaning
The `normalizer.js` file handles the real-world messy data found in the provided Excel sheets:
* **Empty Values:** Replaces empty strings and missing monetary values with `0` or appropriate defaults.
* **Currency Parsing:** Strips "₹" and commas from string values (e.g., "₹10,00,000") and converts them to pure floats.
* **Header Leaks:** Safely ignores "Subitems of..." placeholder rows.
* **Categorical Mapping:** Maps vague terms ("High", "Low") to numerical probabilities (0.8, 0.2) for weighted pipeline calculations.

---

## 8. Supported Queries
The agent supports a wide variety of intents mapped to specific analytics logic:
* **Pipeline Analysis:** *"How is our pipeline looking?"* or *"What is our win rate?"*
* **Sector Analysis:** *"How is the Renewables sector performing?"*
* **Stage Analysis:** *"Break down our deals by stage."*
* **Operational Metrics:** *"How many active work orders do we have?"*
* **Billing & Collections:** *"Show me our current billing and collection metrics."*
* **Cross-Board Analysis:** *"Give me a complete leadership update."* (Pulls execution data and sales data simultaneously).

---

## 9. Deployment
Because the application is decoupled, it should be deployed as two separate services:

* **Frontend (Vercel):** Connect your GitHub repository to Vercel, set the root directory to `frontend`, and Vercel will automatically build the Vite app.
* **Backend (Render):** Connect your GitHub repository to Render (Web Service), set the root directory to `backend`, start command to `node src/app.js`, and add all your `.env` variables to the Render dashboard. Update the `FRONTEND_URL` to match your Vercel URL.

---

## 10. AI Tools Used
* **LLM:** Google Gemini 3.6 Flash (`@google/genai`). Chosen for its speed, large context window, and exceptional ability to strictly output JSON schema for the Query Planning phase.
* **Development AI:** This application was pair-programmed and built from scratch using **Antigravity (Google DeepMind)**, an agentic AI coding assistant. 

---

## 11. Limitations & Future Improvements
* **Ephemeral Database:** The SQLite database (`sql.js`) writes to a local file. If deployed on a free tier service like Render (which utilizes ephemeral file systems), the database resets on every server restart, requiring users to sign up again. Migrating to PostgreSQL would solve this.
* **Static API Token:** The application uses a single Monday.com token for all users. For a true multi-tenant SaaS, the removed OAuth 2.0 flow should be restored.
* **Caching:** Currently, the app uses a basic in-memory cache with a 5-minute TTL to respect Monday.com API rate limits. In production, Redis should be implemented.

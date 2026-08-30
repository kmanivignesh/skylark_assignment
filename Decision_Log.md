# SKYLARK DRONES
**Decision Log — Skylark Insight (Monday.com Business Intelligence Agent)**

---

## 1. Key Assumptions

* **Monday.com is the Source of Truth:** The application relies entirely on the live data from Monday.com. No business data is hardcoded or permanently stored in the application's local database.
* **Distinct Business Datasets:** "Deals" (Sales Pipeline) and "Work Orders" (Execution/Operations) are treated as two separate datasets with distinct data structures, though they can be aggregated for high-level summaries.
* **Deterministic Math:** Missing or inconsistent data is handled gracefully using strict deterministic logic (e.g., defaulting to 0) rather than allowing the AI to guess or invent financial figures.
* **Ambiguity Handling:** The AI agent is programmed to politely ask for clarification if a user's business query is ambiguous or falls completely outside the scope of the available datasets.

## 2. Technical Decisions & Trade-offs

* **Architecture:** A decoupled Client-Server architecture was chosen using a **React/Vite Frontend** and a **Node.js/Express Backend**. This ensures separation of concerns and allows the secure backend to proxy Monday.com requests.
* **Data Access:** The application connects directly to the Monday.com API. To prioritize simplicity and ease-of-testing for the assignment, it uses a global Server-Side Personal Access Token rather than requiring each user to complete a multi-tenant OAuth 2.0 flow.
* **LLM Architecture (Google Gemini):** 
  * The LLM is **not** used to perform math. Financial calculations via LLMs are prone to hallucinations.
  * Instead, the LLM is used strictly for two distinct NLP tasks: 
    1. **Query Understanding:** Translating the user's natural language into a strict JSON "Query Plan".
    2. **Response Generation:** Translating the backend's calculated mathematical metrics into a concise, professional executive summary.
* **Backend Calculations:** All data retrieval, normalization, and mathematical aggregations (e.g., win rates, total pipeline, receivables) are processed deterministically on the Node.js backend.
* **Authentication:** Application-level authentication (protecting the web interface) is implemented using JWTs and a local `sql.js` SQLite database, completely decoupled from the Monday.com integration.

---
*(Page Break for PDF Export)*
---

## 3. Data Resilience

The application specifically handles the messy, real-world data imported into Monday.com using a dedicated `normalizer.js` service:

* **Null/Missing Values:** Empty strings or missing monetary values are intercepted and safely cast to `0` to prevent `NaN` errors during aggregations. Missing probabilities are assigned a neutral `0.5` weight.
* **Inconsistent Names/Text (Currency Parsing):** Financial columns often contain mixed formats (e.g., "₹10,00,000", "5000", "12k"). The normalizer uses regex (`/[^0-9.-]+/g`) to aggressively strip currency symbols, commas, and letters, parsing the remainder into pure floating-point numbers.
* **Invalid/Incomplete Records (Header Leaks):** The Monday.com export contained structural artifacts like rows named `"Subitems of..."`. The normalizer specifically identifies and drops these "header leak" rows to prevent them from skewing project counts.
* **Categorical Mapping:** Vague categorical entries like "High" or "Low" in the Probability column are programmatically mapped to `0.8` and `0.2` numerical equivalents for weighted pipeline calculations.

## 4. What We Would Improve With More Time

Given more time for a true production release, the following improvements would be prioritized:

1. **Persistent Production Database:** Migrate from the ephemeral `sql.js` SQLite file to a managed PostgreSQL database (e.g., Supabase) to prevent user accounts from being wiped when deployed on free hosting tiers (like Render).
2. **True Multi-Tenant OAuth 2.0:** Replace the static Monday.com API token with a full OAuth 2.0 flow, allowing different companies to securely log in and connect their own distinct Monday.com workspaces.
3. **Data Caching:** Implement a Redis caching layer. Currently, every query hits the Monday.com API directly, which would quickly exceed API rate limits under heavy concurrent use.
4. **Visualizations:** Integrate a charting library (like Recharts) into the React frontend to display visual bar charts and pie charts alongside the AI's text response.

## 5. Interpretation of “Leadership Updates”

When a user asks for a "Leadership Update" or "Executive Summary", the application triggers a complex `cross_board_analysis` intent. 

Because a true leadership update requires a holistic view of the company, this intent is interpreted as a command to query **both** boards simultaneously. The backend fetches the Sales Pipeline data (Deals) to calculate top-line potential and win rates, while simultaneously fetching the Operations data (Work Orders) to calculate execution completion rates, billing conversion, and outstanding receivables. The LLM then fuses these two distinct data streams into a single, comprehensive executive briefing.

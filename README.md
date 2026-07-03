# 🤖 Multi-AI Synergy Hub (Full-Stack Chat & Fallback Console)

A state-of-the-art, high-performance conversational workspace integrating Meta Llama, DeepSeek, Google Gemini, and Alibaba Qwen models. This project demonstrates **autonomous model fallback recovery** and **shared-history preservation** across multiple LLM endpoints when a model outage, rate limit (429), or credit exhaustion is detected.

Originally built as a single-page design, the project has been updated into a fully integrated React + TypeScript + Express + PostgreSQL full-stack application.

---

## 📐 Full-Stack Architecture

The application is structured as a unified monorepo divided into two main layers:

```mermaid
graph TD
    A[React TypeScript Frontend - Port 3000] -->|Proxied REST API Requests| B[Express.js Backend - Port 5000]
    B -->|Database Reads/Writes| C[(PostgreSQL Database)]
    B -->|LLM Prompts & History| D[OpenRouter API Gateway]
    D -->|Calls| E[Llama 3.3 70B]
    D -->|Calls| F[DeepSeek R1]
    D -->|Calls| G[Gemini 3.5 Flash]
    D -->|Calls| H[Qwen 2.5 Coder]
```

1. **Frontend (Vite + React + TS)**:
   * Professional glassmorphism design with a fully responsive collapsible sidebar.
   * **Simulation Controls Panel**: Allows live-draining of credits, manual toggling of model failure flags, and enabling/disabling of the fallback mechanism.
   * **Diagnostic Center**: Real-time logging of model response times, API cost deductions, and fallback routing alerts.
   * UI toasts and alert banners displaying critical recovery status details.

2. **Backend (Node.js + Express)**:
   * REST endpoints hosting chat history persistence, fallback event logging, and configuration settings syncing.
   * **Unified API Client**: Employs the OpenAI SDK configured for OpenRouter endpoints.

3. **Database (PostgreSQL 16)**:
   * Keeps conversations and individual message records (categorized by model origin, reasoning logs, response latencies, and fallback flags) saved persistently.

---

## 🛠️ Key Codebase Modifications

We transitioned this project from a basic static site and mock backend into a fully integrated system with the following modifications:

### 1. Database Schema Extensions
* Updated [schema.sql](backend/db/schema.sql) and executed schema alterations to add:
  * `conversations.active_model_id` to persist the selected model in a thread.
  * `messages` columns (`model_id`, `was_fallback`, `fallback_from`, `thinking_time`, and `reasoning`) to preserve diagnostic metadata.
  * A `fallback_events` table to record when and why fallback routing was triggered.

### 2. Robust Multi-Model Fallback Loop
* Modified [routes/chat.js](backend/routes/chat.js) to implement a **sequential model fallback loop** instead of single-step retry:
  ```javascript
  // If a model throws a 429 Rate Limit Exceeded or its status is 'failed', the backend:
  // 1. Logs the outage event.
  // 2. Records a row in fallback_events.
  // 3. Loops through the registry in sequence to find the next active model.
  // 4. Feeds the exact same conversation history to the secondary model.
  // 5. Continues iterating until a successful response is generated.
  ```

### 3. OpenRouter Model Realignment (404 Resolution)
* Re-mapped target endpoints in [registry.js](backend/models/registry.js) to currently active OpenRouter free tier models to avoid 404/removal errors:
  * `llama-3.3` ➔ `meta-llama/llama-3.3-70b-instruct:free`
  * `deepseek-r1` ➔ `openrouter/free` (Dynamic free tier router)
  * `gemini-3.5-flash` ➔ `meta-llama/llama-3.2-3b-instruct:free` (Highly available, low-latency engine)
  * `qwen-coder` ➔ `qwen/qwen3-coder:free`

### 4. Temporary Hackathon Mock Outage Trigger
* Added `const MOCK_API_FAILURE = true;` at the top of [openrouter.js](backend/adapters/openrouter.js).
* Right before executing requests, it checks this variable. If `true` and the selected model is the primary model (`meta-llama/llama-3.3-70b-instruct:free`), it throws a simulated `429 Rate Limit Exceeded` error, triggering the full fallback sequence for demo videos.

### 5. Vite API Proxy Tunneling
* Configured a dev server proxy in [vite.config.ts](frontend/vite.config.ts) to transparently route frontend fetch calls `/api` directly to `http://localhost:5000`.

---

## 📡 API Endpoints

### Configuration & Settings
* `GET /api/settings`: Returns credit balances, model fail states, and auto-fallback options.
* `POST /api/settings`: Updates global configurations and deductions.

### Conversations (Chats)
* `GET /api/chats`: Returns a list of `ChatSummary` objects.
* `POST /api/chats`: Initiates a new conversation with a selected active model.
* `GET /api/chats/:id`: Retrieves full details of a chat including its message history.
* `DELETE /api/chats/:id`: Removes a conversation and cascades message deletions.
* `PATCH /api/chats/:id/model`: Updates the active model ID for a specific conversation thread.

### Chat Engine & Logs
* `POST /api/chats/:id/messages`: Processes incoming messages, runs the sequential fallback loop on model errors, saves messages to the database, and returns the response payload.
* `GET /api/fallbacks`: Lists all historical fallback events for diagnostic logs.

---

## 🚀 Installation & Local Run

### Prerequisites
* **Node.js** (v18+)
* **PostgreSQL** (v16+)
* **OpenRouter API Key**

### 1. Database Setup
Ensure PostgreSQL is running, then log into psql and create the `multicapstone` database:
```sql
CREATE DATABASE multicapstone;
```
*(The backend automatically creates tables and indexes on start using `initDb.js` or queries).*

### 2. Environment Configuration
Create a `.env` file inside the `backend` folder:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multicapstone
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Run Backend Server
```bash
cd backend
npm install
npm run dev
```
*The backend will run on port `5000` (Health Check: `http://localhost:5000/health`).*

### 4. Run Frontend Development Server
Open a new terminal session:
```bash
cd frontend
npm install
npm run dev
```
*Vite will compile and host the web client on [http://localhost:3000/](http://localhost:3000/).*

---

*Enjoy testing the Multi-AI Synergy Hub!*

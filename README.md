# 🤖 Multi-AI Chat 

A robust Node.js backend service that powers a dynamic, multi-model AI chat application. This backend allows users to seamlessly switch between different Large Language Models (LLMs) in the middle of a conversation while perfectly preserving the chat history context.

Powered by **OpenRouter**, this project currently supports state-of-the-art models like Llama 3.3, DeepSeek R1, Gemini Flash, and Qwen 3 Coder.

---

## ✨ Features

- **🔄 Seamless Model Switching:** Change the active AI mid-conversation. The new model reads the exact same database history and picks up exactly where the last one left off.
- **🧠 Universal Adapter Pattern:** Built with a clean `BaseAdapter` architecture. Integrating new models or SDKs is as simple as creating a new class.
- **🗄️ PostgreSQL Persistence:** All conversations and individual messages are safely stored in a relational database, tracking exactly which model generated which response.
- **🚀 OpenRouter Integration:** Access multiple top-tier open-source and proprietary models through a single API key and standardized interface.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js (with CORS & dotenv)
- **Database:** PostgreSQL 16 (using the `pg` node-postgres package)
- **AI SDK:** OpenAI (configured for OpenRouter's API endpoints)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [PostgreSQL](https://www.postgresql.org/) (v16+)
- An [OpenRouter API Key](https://openrouter.ai/)

### 1. Clone & Install
```bash
git clone https://github.com/MallikarjunaM987/multi-ai-chat.git
cd multi-ai-chat
cd backend
npm install
```

### 2. Environment Variables
Create a `.env` file in the `backend` directory:
```env
PORT=3001
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Database Setup
Create a PostgreSQL database named `multiai` (or use the provided init script if you have it set up). The schema expects a `conversations` table and a `messages` table.

### 4. Run the Server
```bash
npm run dev
```
The server will start on `http://localhost:3001`.

---

## 📡 API Endpoints

- `GET /api/models`: Returns a list of all supported AI models.
- `POST /api/conversations`: Creates a new conversation thread.
- `GET /api/conversations`: Lists all past conversations.
- `GET /api/conversations/:id/messages`: Retrieves the full message history for a specific conversation.
- `POST /api/chat`: Send a message to a specific model. Requires `conversationId`, `modelId`, and `message`.

---
*Built with ❤️ for multi-agent experimentation.*

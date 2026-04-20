# 🎙️ Merewa AI: Immersive Voice Social Experience

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://merewa-ai.vercel.app)
[![Tech Stack](https://img.shields.io/badge/tech-FastAPI%20%7C%20Next.js%20%7C%20Weaviate-blue.svg)](#-tech-stack)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Merewa AI** is a cutting-edge, TikTok-inspired voice social platform that leverages Generative AI to create an immersive, personalized audio experience. Users can engage with a vertical, snap-scrolling feed of voice posts, assisted by AI personas that help generate scripts and respond to content in real-time.

---

## ✨ Key Features

- **📱 Immersive Feed**: Smooth, vertical snap-scrolling experience optimized for voice content.
- **🤖 AI-Assisted Creation**: Integrated LLM support (Groq/Ollama) for script generation and persona-based content creation.
- **🔍 RAG-Powered Search**: Advanced vector search using **Weaviate Cloud**, enabling semantic discovery of posts and users.
- **🎙️ High-Quality Audio**: Native voice recording and playback with visualized waveforms.
- **🔐 Secure Authentication**: Multi-provider login (Google, GitHub, Email) powered by **Better Auth** and **Supabase**.
- **⚡ High Performance**: Real-time caching with **Upstash Redis** and asynchronous processing with **FastAPI**.

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (Supabase)
- **Vector DB**: Weaviate Cloud (RAG)
- **Caching**: Upstash Redis
- **LLM**: Groq (Llama 3.1) & Ollama
- **Deployment**: Render (Docker-based Web Service)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Auth**: Better Auth
- **Styling**: Vanilla CSS & Tailwind (Custom UI components)
- **Deployment**: Vercel

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mukesudo/Merewa-AI.git
   cd Merewa-AI
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Update your .env with your Supabase/Groq keys
   docker-compose up --build
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 🏗 Architecture

Merewa AI follows a modern monorepo architecture:
- `/backend`: Python FastAPI service handling the core logic, AI integrations, and database management.
- `/frontend`: Next.js application providing a responsive, high-performance UI.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author
**Mukesudo** - [GitHub](https://github.com/mukesudo)

*Built with passion for the future of voice social media.*

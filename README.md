# Postly AI Backend Engine

Postly is a production-ready, multi-platform AI content publishing engine. Drop an idea, pick your platforms, and let AI do the rest.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Redis (Local or Upstash)
- PostgreSQL (Local or Supabase)

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, REDIS_URL, GEMINI_API_KEY, GROQ_API_KEY, ENCRYPTION_KEY, etc.
   ```
4. Push database schema:
   ```bash
   npx prisma db push
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## 🧪 Testing Guide

### 1. Automated Tests
Run the Jest integration suite:
```bash
npm test
```

### 2. Manual API Walkthrough
Use a tool like Postman or Curl:
- **Register**: `POST /api/auth/register` (email, password, name)
- **Login**: `POST /api/auth/login` -> returns `accessToken`
- **Set AI Keys**: `PUT /api/user/ai-keys` (headers: `Authorization: Bearer <token>`)
- **Generate**: `POST /api/content/generate` (idea, post_type, tone, model)
- **Publish**: `POST /api/posts/publish` (pass the generated content)

### 3. Telegram Bot Flow
1. Start the bot: `/start`
2. Initiate post: `/post`
3. Follow the conversational steps (Type -> Platforms -> Tone -> Model -> Idea).
4. Preview generated content and click **Confirm** ✅.
5. Check status: `/status`.

## 🏗 Architecture
- **Tech Stack**: Node.js, Express, Prisma, Redis, BullMQ, GrammY.
- **AI Models**: Gemini 1.5 Flash & Llama 3 (Groq).
- **Security**: AES-256 encryption at rest for sensitive keys.
- **Queue**: Distributed job processing with exponential backoff retries.

## 📄 License
MIT

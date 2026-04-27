# Postly AI — Multi-Platform Content Publishing Engine 🚀

Postly is a production-grade AI content publishing system. It allows users to drop a raw idea into a Telegram bot, choose their target platforms and AI models, and automatically generate and publish optimized content.

**Live API URL**: `https://postly-api-production.upstation.app` (Example Placeholder)
**Telegram Bot**: `@PostlyAI_Bot`

## 🌟 Senior SDE Features
- **Deep Tracing**: Every Redis hit/miss and Prisma query is measured for latency.
- **Resilient Queuing**: BullMQ-powered publishing with exponential backoff retries (1s -> 5s -> 25s).
- **Secure Auth**: JWT Rotation with encrypted social account storage (AES-256).
- **Unified Certification**: Comprehensive Jest suite covering Auth, API, Worker, and Telemetry.

## 🛠️ Local Setup
1. **Clone & Install**:
   ```bash
   git clone https://github.com/PAMIDIROHIT/Credes.git
   npm install
   ```
2. **Environment**:
   Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` (Supabase/Postgres)
   - `REDIS_URL` (Upstash/Local)
   - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
3. **Docker (Recommended)**:
   ```bash
   docker-compose up
   ```
4. **Prisma Setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## 📋 API Documentation
- **Auth**: `POST /api/auth/login`, `POST /api/auth/refresh`
- **Profiles**: `GET /api/user/profile`, `PUT /api/user/ai-keys`
- **Posts**: `POST /api/posts/publish`, `GET /api/posts?status=published`
- **Statistics**: `GET /api/dashboard/stats`

## 🧪 Testing
Run the unified certification suite:
```bash
npm test
```

## 🎥 Demo
[Link to Loom Recording]
- Telegram Bot Flow (Idea -> Preview -> Post)
- Unified Test Result (100% Pass)
- Telemetry Logs in Terminal

# Postly Backend Engine

This backend serves as the core layer for Postly — a multi-platform AI content publishing system. It supports native JWT auth, secure AES-256 API key encryption, background jobs for publishing, and direct AI integrations with Google Gemini and Groq (compatible models substituted as requested by users).

## Tech Stack
- **Runtime:** Node.js (v18+ using pure ECMAScript Modules \`.js\`)
- **Framework:** Express.js (Selected over Fastify for mature middleware ecosystem and easier dashboard routing setups)
- **Database:** PostgreSQL (via Supabase) and Redis (Upstash)
- **ORM:** Prisma
- **Bot Interface:** grammy (configured for stateless/webhook-friendly context storage)
- **AI Integrations:** Google Generative AI (Gemini 1.5 Flash), Groq (Mixtral 8x7b)
- **Queue Engine:** BullMQ
- **Authentication:** JWT Access + Refresh token rotation

## Setup Instructions

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/PAMIDIROHIT/Credes.git
   cd Credes
   \`\`\`

2. **Install Dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure Environment:**
   Copy \`.env.example\` to \`.env\` and add your secrets (Supabase DB string, Upstash Redis endpoints, Gemini/Groq keys, and Telegram bot token).

   *Note: Do NOT commit your \`.env\` file.*

4. **Initialize Database**
   Push the Prisma schema to your Supabase PostgreSQL Database:
   \`\`\`bash
   npx prisma db push
   npx prisma generate
   \`\`\`

5. **Start Application:**
   \`\`\`bash
   npm run dev
   # Or for production:
   # npm start
   \`\`\`

## Architecture & Data Flow
User Telegram Command -> Grammy Bot Webhook -> Redis State Update -> Idea Processing 
-> AI Content Generator (Groq/Gemini) -> Output Formatting -> BullMQ Queue 
-> Simulated Social Account Posting (Twitter, LinkedIn, Instagram)

Check the endpoints explicitly mapped in the assignment inside \`src/routes/auth.routes.js\` and \`src/routes/post.routes.js\`.

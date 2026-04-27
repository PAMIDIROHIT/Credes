# Postly: Technical Architecture

## Overview
Postly is a multi-platform content publishing engine built with Node.js and a modular, service-oriented architecture.

## Core Components
- **Auth Engine**: JWT-based authentication with refresh token rotation and salted bcrypt hashing (cost: 12).
- **AI Orchestration Layer**: A dynamic provider-switchable layer supporting Google Gemini and Groq (Llama 3).
- **Publishing Pipeline**: BullMQ-driven queue system with exponential backoff (1s -> 5s -> 25s) and platform-specific workers.
- **Telegram Interface**: A stateful bot (GrammY) with Redis session storage for conversational publishing.
- **Security**: All sensitive keys and tokens (AI keys, Social OAuth) are encrypted at rest using AES-256-CBC.

## Data Flow
1. User provides an idea via REST API or Telegram.
2. AI Engine generates platform-specific content (Twitter, LinkedIn, IG, Threads).
3. Post is saved to PostgreSQL and queued in Redis (BullMQ).
4. Workers process jobs, calling platform publishers with encrypted credentials.
5. Status is updated in real-time for the dashboard.

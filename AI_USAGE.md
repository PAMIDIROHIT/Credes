# AI Usage Disclosure (Credes TechLabs)

## Tools Used:
- **Assistant:** GitHub Copilot / Gemini 3.1 Pro (via VS Code)
- **Role:** Scaffolding automation, ES modules conversion, boilerplate optimization.

## Specific Implementations Assisted by AI:
1. **TypeScript to JavaScript Switch**:
   * *Prompt/Task:* Convert a large TypeScript API scaffolding set directly to plain JavaScript standard ES modules natively mapped without build tools.
   * *Validation:* Reviewed `import` statements ensuring `.js` extensions were enforced, replaced custom TS interface types with standard Express syntax, and tested execution.
2. **AI Engines Configuration (Groq / Gemini)**:
   * *Task:* Implement backend handler mapping requests to Gemini or Groq SDKs replacing the fallback mock structures in original drafts.
   * *Validation:* Added `Groq` and `@google/generative-ai` packages, ensuring error handling matched assignment expectations natively.
3. **Queue Mechanism (BullMQ)**:
   * *Task:* Implement queue processing with exponential fallback delays mapping to database `status` fields.
   * *Validation:* Validated the Redis connection string fallback and simulated platform hooks in `publisher.js`.
4. **Telegram Flow (Grammy)**:
   * *Task:* Map stateful steps required by the exact assignment (`Start -> Type -> Platforms -> Tone -> Model -> Idea -> Preview`).
   * *Validation:* Managed context storage directly into Upstash Redis via `ioredis` utilizing `ctx.chat.id`.

### Policy Note
This project adheres to the Credes usage policy by ensuring no blind code pastes exist. AI acted as a force multiplier strictly for generating repetitive configuration structures while the logic architecture mapping (Supabase, Upstash Redis, JWT lifecycle, AES token encryption) was manually requested and actively validated prior to git commits.

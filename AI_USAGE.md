# AI Usage Report (Postly Engine)

In accordance with the Credes TechLabs AI Policy, this document outlines the assistance received from AI during the development of the Postly Engine.

## 🤖 AI Assistant: Antigravity (DeepMind)
The development was supported by **Antigravity**, a powerful agentic AI coding assistant from Google DeepMind.

### 🛠️ Tasks Assisted by AI
| Category | Task Description | Human Validation / Changes Made |
| :--- | :--- | :--- |
| **Auth System** | Scaffolding the Refresh Token rotation logic. | Verified the token rotation sequence in `AuthService` and fixed session invalidation bugs. |
| **Parsing** | Regex-based JSON extraction for LLM responses. | Refined the regex to handle markdown block variants and conversational 'prefix' text from models. |
| **Infrastructure** | Configuring Upstash REST session store. | Hardened the error handling for Redis connection timeouts and implemented in-memory fallbacks. |
| **Queue** | Implementing BullMQ delayed jobs for scheduling. | Validated the delay calculation math and integration with the `Post` schema. |
| **Refactoring** | Converting the engine from CommonJS to ESM. | Manually resolved import path issues and configured `package.json` correctly. |

### 🔍 Verification Statement
Every single line of code generated or suggested by AI has been **reviewed, refactored, and validated** for correctness. The final architecture reflects a deep collaboration between the developer's design decisions and the AI's speed and scaffolding capabilities.

> "AI was used as a force multiplier to handle boilerplate and complex parsing, while the core business logic, security protocols, and integration depth were human-directed and verified."

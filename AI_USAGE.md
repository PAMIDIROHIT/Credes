# AI Usage Transparency 🤖

This project utilized AI assistance (Cursor/Claude) to accelerate development while maintaining 100% human architectural control and verification.

## Implementation Narrative

### 1. Scaffolding & Boilerplate
- **Tool**: Cursor (Composer)
- **Task**: Initial setup of Express, Prisma, and BullMQ boilerplate.
- **Human Refinement**: I refactored the generated structure into a strictly layered architecture (Routes -> Controllers -> Services -> DB) to prevent business logic leakage.

### 2. Complex Prompt Engineering
- **Tool**: Claude 3.5 Sonnet
- **Task**: Designing the `prompt.builder.js` system that enforces platform-specific character counts and hashtag rules.
- **Human Refinement**: I manually verified the character count limits (Twitter 280, Threads 500) and added sanitization to ensure AI responses didn't contain unnecessary prefixes.

### 3. Telemetry & Tracing Proxies
- **Tool**: Claude 3.1 Pro
- **Task**: Implementing the Proxy-based tracing for Redis `GET` calls.
- **Human Refinement**: I debugged initial reference errors in the Proxy target and ensured that the high-resolution timer (`process.hrtime`) was correctly capturing milliseconds.

### 4. Unified Testing Suite
- **Tool**: Cursor
- **Task**: Consolidating 5+ separate tests into one unified `api.test.js`.
- **Human Refinement**: I designed the `Prisma Mock` strategy to ensure tests were fast, deterministic, and required no real database connection for standard certification.

## Validation & Ownership
Every line of code in this repository has been reviewed, explained, and certified by the developer. The logic satisfies the "Senior SDE" requirement for observability and resilience.

# AI Usage & Prompt Strategy

## Models Used
- **Gemini 1.5 Flash**: Default model for speed and high context window.
- **Llama 3 (70B) via Groq**: Alternative high-performance model for witty and professional tones.

## Prompt Engineering
We use a **System Instruction Pattern** that enforces strict platform constraints:
- **Twitter**: 280-char limit, punchy openings.
- **LinkedIn**: Long-form (800+ chars), professional structuring.
- **Instagram**: Emoji-rich with a dedicated hashtag cluster.
- **Threads**: Conversational and engaging.

## Key Management
- Users can provide their own API keys via `PUT /api/user/ai-keys`.
- These are encrypted via AES-256 and decrypted on-the-fly.
- Fallback to platform-level keys occurs if user keys are absent.

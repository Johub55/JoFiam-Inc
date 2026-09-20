# AGENTS.md - Persistent Project Instructions

## 🔒 Critical Protected Systems (DO NOT ALTER)

### 1. Text-to-Speech (TTS) & Audio Engine (`src/services/audio.ts` & `index.html`)
- **STRICT DIRECTIVE**: Do NOT modify or refactor the static host TTS audio engine or the `<meta name="referrer" content="no-referrer" />` tag in `index.html`.
- **Reasoning**: Google Translate TTS on static hosts (GitHub Pages) requires `referrerPolicy = "no-referrer"` with `client=tw-ob` to bypass 403/404 restrictions and CORS headers. This setup is fully tested and verified working.

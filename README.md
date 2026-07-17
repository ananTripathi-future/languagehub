# LanguageHub - Next-Gen Voice & Text AI Translator

🚀 **Live Deployment**: [https://languagehub.vercel.app/](https://languagehub.vercel.app/)

LanguageHub is a premium web-based translator that runs locally in your browser. It leverages standard web technologies alongside advanced browser speech recognition and synthesis models to offer seamless text and voice translation.

## Features

- 🌟 **Premium Glassmorphism Aesthetic**: Beautiful dark-mode neon controls with interactive states and smooth animations.
- 🎙️ **Real-Time Voice Input (Speech-to-Text)**: Instantly dictate in your source language.
- 🔊 **Voice Translation Output (Text-to-Speech)**: Listen to translated messages with adjustable voice rates and pitches.
- 🔄 **Swap Languages**: Instantly swap source and target layouts.
- 📁 **Offline Storage (History & Favorites)**: Access your past translations and pin your most-used phrases.
- ⚙️ **Custom Translation API Endpoint Support**: Use the free Google Translate engine out of the box, or hook up your custom LibreTranslate/DeepL endpoints.

---

## Getting Started

Since LanguageHub is a web application utilizing native Web Speech APIs, it runs best when served over a local server (speech recognition requires a web server context for microphone permission security).

### Steps to Run

1. **Launch a Local Server**:
   You can serve the directory using python, node, or any light server:
   ```bash
   # Python (built-in)
   python -m http.server 8080 --bind 127.0.0.1
   ```
2. Open your browser and navigate to `http://127.0.0.1:8080`.

### Voice Configuration & Settings

- **Microphone Permissions**: Ensure you click "Allow" when the browser requests microphone access. If blocked, check the camera/microphone icon in the address bar.
- **Accents/Synthesis Voices**: Use the settings panel (sliders icon in the top right) to adjust the reading speed, pitch, or configure a specific accent.

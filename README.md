# LanguageHub - Next-Gen Voice & Text AI Translator

🚀 **Live Deployment**: [https://languagehub.vercel.app/](https://languagehub.vercel.app/)

LanguageHub is a premium web-based translator that runs locally in your browser. It leverages standard web technologies alongside advanced browser speech recognition and synthesis models to offer seamless text and voice translation.

---

## Features

- 🌟 **Premium Glassmorphism Aesthetic**: Beautiful dark-mode neon controls with interactive states, hover effects, and smooth animations.
- 🎙️ **Real-Time Voice Input (Speech-to-Text)**: Instantly dictate in your source language using browser hardware-accelerated speech engines.
- 🔊 **Voice Translation Output (Text-to-Speech)**: Listen to translated messages with adjustable voice rates (speed), pitch, and accents.
- 📲 **Progressive Web App (PWA)**: Fully installable as a standalone app on desktop and mobile devices. Caches assets using a Service Worker to load instantly offline.
- 🔄 **Swap Languages**: Instantly swap source and target language layouts.
- 📁 **Offline Storage (History & Favorites)**: Access your translation history and star your favorite phrases to keep them pinned locally.
- ⚙️ **Multi-Engine Translation**: Powered by the high-speed Google Translate engine by default, with MyMemory and Custom API URL endpoint options.
- 📈 **Analytics Integrated**: Out-of-the-box Google Analytics tracking for monitoring user traffic and usage.

---

## Getting Started

Since LanguageHub is a web application utilizing native Web Speech APIs, it runs best when served over a secure HTTPS environment or a local server.

### Steps to Run Locally

1. **Launch a Local Server**:
   You can serve the directory using python, node, or any light server:
   ```bash
   # Python (built-in)
   python -m http.server 8080 --bind 127.0.0.1
   ```
2. Open your browser and navigate to `http://127.0.0.1:8080`.

### Voice Configuration & Settings

- **Microphone Permissions**: Ensure you click "Allow" when the browser requests microphone access. If blocked, check the camera/microphone permission icon in your browser's address bar.
- **Accents/Synthesis Voices**: Use the settings panel (sliders icon in the top right) to adjust reading speed, pitch, or configure a specific local TTS engine accent.

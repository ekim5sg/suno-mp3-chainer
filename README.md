# 🎵 Suno MP3 Chainer

A **100% browser-based** tool for chaining multiple Suno MP3 generations (v1, v2, or more) into a single track with **smooth crossfades**.

No uploads. No servers. Everything runs locally in your browser.

---

## ✨ Features

- 🎶 Chain 2+ MP3 files into one
- 🔀 Smooth crossfade transitions (configurable duration)
- ⚡ Fast in-browser processing using Web Audio API
- 📊 Real-time progress indicator
- 🎧 Audio preview before download
- ⬇️ Download final merged MP3
- 🔒 Privacy-first: files never leave your device

---

## 🚀 Live Demo

**Hostek deployment:**  
👉 https://webhtml5.info/suno-mp3-chainer/

*(Also works on GitHub Pages)*

---

## 🧠 How It Works

1. MP3 files are decoded using the **Web Audio API**
2. Audio is scheduled in an `OfflineAudioContext`
3. Crossfades are applied using gain ramps
4. Final audio is rendered to PCM
5. PCM is encoded to MP3 using **lamejs**
6. Result is previewed and downloaded locally

No ffmpeg. No WASM workers. No CORS issues.

---

## 📂 Project Structure

```
suno-mp3-chainer/
├── index.html
├── styles.css
├── web.config          # IIS / Hostek support
├── js/
│   ├── app.js          # UI + state management
│   ├── audio_merge.js  # Web Audio crossfade logic
│   └── mp3_encode.js   # Int16Array + lamejs encoder
└── vendor/
    └── lame.min.js
```

---

## 🛠️ Local Development

Just open `index.html` in a browser:

```bash
cd suno-mp3-chainer
python3 -m http.server 8080
```

Then visit:
```
http://localhost:8080
```

*(A local server is required for ES modules.)*

---

## 🌐 IIS / Hostek Deployment Notes

This project includes a `web.config` that:
- Forces `index.html` as the default document
- Correctly maps MIME types for:
  - `.js`
  - `.css`
  - `.json`
  - `.wasm` (future-safe)

This avoids common IIS issues like:
> “Failed to load module script: MIME type text/html”

---

## 🧩 Browser Compatibility

- ✅ Chrome / Edge (recommended)
- ✅ Firefox
- ⚠️ Safari (works, but slower due to Web Audio differences)

---

## 📜 License

MIT License — build, remix, and deploy freely.

---

## 🙌 Credits

- **lamejs** for MP3 encoding  
- **Web Audio API** for offline rendering  
- Built by **Michael Givens**  
- Inspired by Suno AI multi-generation workflows

---

## 💡 Why This Exists

Suno often generates **two great versions** of a song.  
This tool lets you keep **both** — seamlessly.

Enjoy 🎧

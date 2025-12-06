# 3D Christmas Motion Tree

Interactive React + Three.js holiday demo with optional MediaPipe hand tracking.

## Quick start (PowerShell)

```powershell
# Install deps (one-time)
npm ci

# Start dev server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

Notes

- This project uses Vite — opening `index.html` with `file://` will not work.
- Hand-tracking uses MediaPipe; if the webcam or model fails the app will gracefully disable that feature.

Publishing to GitHub (local steps)

1. Create a new repository on GitHub (via the web UI or `gh` CLI).
2. Add the remote and push the code:

```powershell
git init
git add .
git commit -m "chore: prepare project for publish"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

CI & GitHub Pages

- This repo contains workflows that run a build on push/PR and deploy `dist` to GitHub Pages automatically when you push to `main`.

If you'd like, I can create the remote and push for you (you'll need to authenticate `gh` or provide the repo URL).<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1BkZE8FeycKyeVcdy0lYm70C3HP2hj4Am

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

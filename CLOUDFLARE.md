# Cloudflare Deployment Guide

This project is fully configured for deployment on **Cloudflare Pages** with **Cloudflare Pages Functions** for the backend API.

---

## ⚡ Quick Deployment via Cloudflare Dashboard (Recommended)

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
4. Under **Settings** > **Functions** > **Compatibility flags**:
   - Ensure `nodejs_compat` is enabled (already defined in `wrangler.jsonc`).
5. Click **Save and Deploy**.

---

## 🛠️ Deployment via Wrangler CLI

You can also test and deploy directly from your terminal using Cloudflare's official CLI, **Wrangler**:

### 1. Build the Application
```bash
npm run build
```

### 2. Local Preview with Edge Functions
Test both the static frontend and Cloudflare Pages Functions locally:
```bash
npm run pages:dev
```
*(Runs `wrangler pages dev dist`)*

### 3. Deploy to Cloudflare Pages
```bash
npm run pages:deploy
```
*(Runs `wrangler pages deploy dist`)*

---

## 📁 Cloudflare Configuration Files Included

- **`wrangler.jsonc`**: Cloudflare Pages configuration defining compatibility flags (`nodejs_compat`), project name, and build output directory.
- **`functions/api/[[path]].ts`**: Cloudflare Pages Function running on the edge runtime with full support for:
  - Eduteria Course List (`/api/courses`)
  - Subjects (`/api/course/subjects`)
  - Chapters & Topics (`/api/course/topics`)
  - Lectures (`/api/course/lectures`)
  - Video Stream Resolution (`/api/video/stream` and `/api/stream/videocrypt`)
  - HLS Stream Proxy (`/api/proxy/stream`)
  - Image Proxy with edge caching (`/api/img`)
- **`public/_redirects`**: Single-Page Application (SPA) fallback routing so refreshing deep links returns `index.html` with HTTP 200.
- **`public/_headers`**: Performance and security headers (1-year immutable caching for `/assets/*` and CORS headers).
- **`public/_routes.json`**: Optimizes Cloudflare routing rules so static assets bypass worker invocations for fast CDN delivery.
- **`.nvmrc` & `.node-version`**: Instructs Cloudflare's build image to use Node.js 20.

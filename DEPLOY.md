# Deploying CipherChat to Render (single web service)

CipherChat is a **monolith**: the backend builds and serves the React frontend,
so the whole app runs as **one** Render web service. Root scripts already handle it:

- `npm run build` → installs backend + frontend deps and builds the frontend
- `npm start` → runs the backend, which serves the built frontend + API + Socket.IO

---

## 1. Prerequisites (you do these)

- **Push the repo to GitHub** (you said you'd handle this). `.env` is gitignored, so no secrets get pushed.
- **MongoDB Atlas**: in your cluster → Network Access → add `0.0.0.0/0` (allow from anywhere) so Render can connect.
- **Cloudinary account** (free): needed for photo/video messages + profile pictures. Copy Cloud name, API Key, API Secret from the dashboard.
- **Render account**: https://render.com (free tier is fine).

## 2. Create the service on Render

**Option A — Blueprint (easiest):** the repo has `render.yaml`.
Render Dashboard → **New → Blueprint** → connect your repo → it reads `render.yaml` and creates the service. Then fill in the env vars (step 3).

**Option B — Manual:** New → **Web Service** → connect repo, then set:
- Runtime: **Node**
- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Instance Type: Free

## 3. Environment variables (set in Render dashboard → Environment)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random string |
| `CLIENT_URL` | your Render URL (set after first deploy — see step 5) |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | optional — only for Forgot Password |

> Do **not** set `PORT` — Render provides it automatically.

## 4. Deploy

Render builds and starts automatically. Watch the logs for:
`server is running on PORT:...` and `MongoDB connected: ...`

## 5. Set CLIENT_URL and redeploy

After the first deploy you'll have a URL like `https://cipherchat.onrender.com`.
Set `CLIENT_URL` to that exact URL, then trigger a redeploy (Manual Deploy → Deploy latest commit).
This tightens CORS/Socket.IO to your real origin.

## 6. Go live

Open the URL, click **Create account**, and you're live. Test: signup → login →
search a user → message with photo/video → real-time delivery.

---

## Notes & gotchas

- **Free tier sleeps** after ~15 min of inactivity; the first request then takes ~30–60s to wake. Real-time sockets reconnect automatically once awake. Upgrade to a paid instance to keep it always-on.
- **Media needs Cloudinary** — without those three env vars, sending photos/videos and uploading profile pictures will fail (everything else works).
- **Custom domain**: Render → Settings → Custom Domains. After adding it, update `CLIENT_URL` to the custom domain and redeploy.
- Secrets live only in the Render dashboard, never in git.

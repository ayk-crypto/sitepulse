# SitePulse Web Dashboard

React + Vite frontend for SitePulse by Onset Media.

## Local setup

```bash
npm install
npm run dev
```

The dashboard stores the backend API URL and internal admin token in browser `localStorage` from the Settings page.

## Environment

Copy `.env.example` to `.env` if you want to set the default API URL:

```text
VITE_API_BASE_URL="https://sitepulse-api-84m8.onrender.com"
```

Do not put admin tokens in Vite environment files. Add the admin token in the Settings page.

# St. Joseph IoT Frontend

React single-page application for the St. Joseph IoT dashboard.

The app provides:

- Email/password registration and login against the backend API.
- JWT-based authenticated API requests.
- Socket.IO telemetry updates for the resident lift dashboard.
- A responsive dashboard inspired by the patient lift monitoring mockup.

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend locally:

```bash
npm run dev
```

By default, the frontend expects the backend at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` for local overrides:

```bash
cp .env.example .env.local
```

Supported variables:

- `VITE_API_BASE_URL` - backend REST API base URL.
- `VITE_SOCKET_URL` - backend Socket.IO URL. Defaults to `VITE_API_BASE_URL`.

Example:

```bash
VITE_API_BASE_URL=https://api.jeremycloudlabs.com
VITE_SOCKET_URL=https://api.jeremycloudlabs.com
```

## Build

Create the static production build:

```bash
npm run build
```

The generated files in `dist/` can be uploaded to S3 and served through CloudFront.

## Preview Dashboard

During local development only, this URL opens the dashboard without logging in:

```text
http://127.0.0.1:5173/?preview=dashboard
```

This preview route is useful for UI review and does not affect the production build's normal login flow.

# Job Tracking System

Track your job search pipeline with a clean UI, structured application data, and AI-assisted parsing from job links.

## Highlights
- End-to-end workflow: add, import, search, and triage applications.
- Status management with instant updates.
- Detailed view with skills and soft skills.
- Clean API surface built for extension.

## Tech Stack (Skills Showcase)
Frontend
- React + TypeScript
- Vite
- Tailwind CSS

Backend
- Node.js + Express
- TypeScript
- SQLite

AI Integration
- Gemini content parsing

## Architecture
- `frontend/`: React single-page app.
- `backend/`: Express API + SQLite schema and services.

## Getting Started
Prerequisites
- Node.js 18+
- npm or pnpm

Backend
```bash
cd backend
npm install
npm run dev
```

Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
Backend
- `PORT` (optional, default `3000`)

Frontend
- `VITE_API_BASE_URL` (optional, default `http://localhost:3000/api`)

## Core API Routes
- `GET /api/applications`: list applications
- `GET /api/applications/:id`: get application
- `GET /api/applications/:id/detail`: get application + skills
- `POST /api/applications`: create application
- `PUT /api/applications/:id`: update application
- `DELETE /api/applications/:id`: delete application
- `POST /api/applications/import`: import from job link

## Why This Project
This project demonstrates full-stack ownership: UI design, state management, backend APIs, relational data modeling, and AI-assisted data extraction.

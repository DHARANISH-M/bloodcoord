# Blood Availability Frontend

This repo contains the frontend for the Blood Availability & Coordination Platform.

Tech: React (Vite) + TailwindCSS + Leaflet

Quick start:

```bash
cd frontend
npm install
npm run dev
```

Environment:
- Create a `.env` file in the `frontend` folder with `VITE_API_URL` pointing to your backend, e.g.: `VITE_API_URL=http://localhost:4000`

Notes:
- The scaffold implements routes, auth context (JWT storage), protected routes, and a Leaflet map component using the Leaflet CDN.
- Connect to your backend API endpoints (as defined in the project spec) to enable full functionality.
- Install additional packages if you want email/SMS preview/testing utilities.

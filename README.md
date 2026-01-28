# TaskFlow

This repository now keeps the entire app inside `frontend/taskflow-react` so there is a single source of truth.

## Local development

```bash
cd frontend/taskflow-react
npm install
npm run dev
```

## Production build

```bash
cd frontend/taskflow-react
npm run build
```

Point any deployment (Vercel, etc.) at the `frontend/taskflow-react` directory.

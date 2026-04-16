# SubLaunch MVP

Plateforme SaaS pour vendre un accès récurrent à un groupe Telegram privé via abonnement Stripe.

## Stack

- **Frontend** (branche `main`) : Next.js + Tailwind CSS → Vercel
- **Backend** (branche `backend`) : Node.js + Express + MongoDB → Render

## Démarrage rapide

### Backend
```bash
cd backend && npm install
cp .env.example .env  # remplir les variables
npm run dev
```

### Frontend
```bash
cd frontend && npm install
cp .env.example .env.local  # remplir les variables
npm run dev
```

## Variables d'environnement requises

### Backend (.env)
- `MONGODB_URI` — URI MongoDB Atlas
- `JWT_SECRET` — clé secrète JWT
- `STRIPE_SECRET_KEY` — clé secrète Stripe
- `STRIPE_WEBHOOK_SECRET` — secret webhook Stripe
- `BREVO_API_KEY` — clé API Brevo
- `TELEGRAM_BOT_TOKEN` — token bot Telegram
- `TELEGRAM_GROUP_ID` — ID du groupe Telegram (ex: -100...)
- `FRONTEND_URL` — URL du frontend

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` — URL du backend
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — clé publique Stripe

## Déploiement

- `main` → **Vercel** (frontend Next.js)
- `backend` → **Render** (backend Express)

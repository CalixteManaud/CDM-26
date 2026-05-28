# CDM 26 — Coupe du Monde FIFA 26 sur Twitch

Plateforme Next.js de gestion de tournois esport pour la **Coupe du Monde FIFA 26**
diffusée sur Twitch. Tournois (phase de poules + bracket d'élimination), équipes /
coachs / joueurs, matchs en direct, et un système de **paris en pari mutuel** placés
depuis le site avec mises débitées sur les **points de chaîne Twitch** via l'API
Wizebot.

🌐 **Production** : [cdm.rgtcity.fr](https://cdm.rgtcity.fr)

---

## Stack

| Couche | Choix |
|---|---|
| Framework | Next.js 16 — **Pages Router** (pas App Router) |
| Auth | Clerk (middleware dans `proxy.ts`, OAuth Twitch inclus) |
| Database | Prisma 7 + PostgreSQL (Supabase) |
| Stockage | Vercel Blob (logos d'équipes, avatars) |
| Wallet | Wizebot — débit/crédit des points de chaîne Twitch |
| Rate limit | Upstash Redis (fallback in-memory en dev) |
| Cron | Vercel Cron (retry des crédits Wizebot échoués) |
| Styling | Tailwind CSS 4 + shadcn/ui + Magic UI |
| Animations | Framer Motion / motion |

---

## Quick start

```bash
# 1. Cloner + installer
git clone https://github.com/<ton-org>/cdm-26.git
cd cdm-26
npm install

# 2. Configurer les env vars
cp .env.example .env.local
# Remplis Clerk, Supabase, Vercel Blob (au minimum)
# Voir .env.example pour les détails de chaque section

# 3. Préparer la DB
npx prisma migrate deploy
npx prisma generate
npm run seed              # optionnel : seed un tournoi d'exemple

# 4. Lancer le dev server
npm run dev               # → http://localhost:3000
```

---

## Variables d'environnement (résumé)

Cf. `.env.example` pour les détails et les liens de setup. Sections requises :

1. **Clerk** — auth (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`)
2. **Database** — Supabase pooler (`DATABASE_URL` port 6543) + direct (`DIRECT_URL` port 5432)
3. **Vercel Blob** — `BLOB_READ_WRITE_TOKEN`
4. **Wizebot** — `WIZEBOT_API_KEY` seule (la clé scope déjà au channel)
5. **Vercel KV / Upstash Redis** — `KV_REST_API_URL` + `KV_REST_API_TOKEN` (rate limiting prod)
6. **Cron** — `CRON_SECRET` pour authentifier les jobs Vercel Cron
7. **Supabase webhook** — `SUPABASE_WEBHOOK_SECRET` pour la sync bidirectionnelle DB ↔ Clerk
8. **App** — `NEXT_PUBLIC_APP_URL`

En dev, l'absence des vars Wizebot / KV mock les appels (logs au lieu de transactions réelles).
En prod, Wizebot est obligatoire pour les paris.

---

## Architecture

### Pages Router — pas App Router
Le projet utilise le **Pages Router** historique de Next.js — pas de Server
Components, pas de `app/`, pas de `route.ts`. Data fetching via `getServerSideProps`,
API routes en `pages/api/`, layout dans `pages/_app.tsx`.

⚠️ Les **Server Actions** (`'use server'`) ne sont **pas appelables depuis du client**
en Pages Router. Pour appeler de la logique serveur depuis un handler React, passe
par `fetch('/api/...')` vers une API route. Cf. `CLAUDE.md` pour les détails.

### Structure
```
actions/           # Server Actions (utilisés depuis getServerSideProps + API routes)
components/        # UI — landing, betting, tournament, layout, ui, ...
hooks/             # Hooks React (use-live-match-pool, use-image-upload)
lib/               # Helpers serveur (clerk, prisma, wizebot, rate-limit, utils/)
pages/             # Pages + API routes (Pages Router)
  api/             #   - bets, markets, matches, admin, webhooks, profile
prisma/            # Schema + migrations + seed
public/            # Assets statiques
styles/            # Tailwind config + CSS globals
proxy.ts           # Clerk middleware (PAS middleware.ts)
vercel.json        # Crons Vercel
```

### Modules clés
- **`lib/wizebot.ts`** — outbound Wizebot (debit / credit / getBalance) avec timeout + retry
- **`lib/utils/betting.ts`** — `placeBet`, `settleMatchBets` (concurrence bornée), `retryFailedCredits`
- **`lib/utils/odds.ts`** — `computeLiveOdds` (pari mutuel, client-safe)
- **`lib/utils/permissions.ts`** — `canUserBetOnMatch`, `isSiteAdmin`, `canManageMatch`...
- **`lib/rate-limit.ts`** — Upstash si configuré, sinon in-memory
- **`hooks/use-live-match-pool.ts`** — polling 5s des cotes + pool sans reload

---

## Règles métier — paris

- **Entrée unique** : UI cdm.rgtcity.fr → API routes → débit Wizebot → DB
- **Pari mutuel** : aucune cote stockée, `(total / pool[X]) × (1 - house%)` recalculé live
- **Qui peut parier** : tout user authentifié avec Twitch lié, SAUF :
  - Admins (ils valident les résultats)
  - Joueurs inscrits dans le tournoi (info privilégiée)
  - Coachs d'une équipe du tournoi
- **Limite par pari** : 50 000 pts max
- **No switching sides** : impossible de changer d'outcome après mise — on peut uniquement cumuler
- **Rate limit** : 10 paris/min/user
- **Settlement** : fire-and-forget après soumission du résultat, crédits Wizebot en parallèle borné (10 workers), failed credits rejoués automatiquement toutes les 5 min via cron

Cf. `CLAUDE.md` pour le détail complet (flow, sécurités, idempotence).

---

## Déploiement

### Vercel (recommandé)

1. Connecte le repo GitHub à Vercel
2. Project Settings → Environment Variables → ajoute toutes les vars de `.env.example`
3. Storage → Browse → **Upstash → Upstash for Redis** → connect to project (auto-injecte `KV_*`)
4. Premier push sur `main` → Vercel build + deploy automatique
5. Configure les webhooks externes (cf. ci-dessous)

### Webhooks à configurer après le 1er deploy

**Clerk** (sync user.created / updated / deleted) :
- Clerk Dashboard → Webhooks → Add Endpoint
- URL : `https://cdm.rgtcity.fr/api/webhooks/clerk`
- Events : `user.created`, `user.updated`, `user.deleted`
- Copie le signing secret → `CLERK_WEBHOOK_SECRET` côté Vercel

**Supabase** (sync DB → Clerk pour les modifs depuis Studio) :
- Supabase Dashboard → Database → Webhooks → Create
- Table `public.User`, events `UPDATE` + `DELETE`
- URL : `https://cdm.rgtcity.fr/api/webhooks/supabase`
- Header : `x-supabase-webhook-secret` = `SUPABASE_WEBHOOK_SECRET`

**Vercel Cron** : déclaré dans `vercel.json`, actif après deploy. Vérifie dans
Project Settings → Cron Jobs que `/api/admin/bets/retry-failed` apparaît bien.

---

## Migrations Prisma

Supabase pooler refuse les shadow DB → **pas de `prisma migrate dev`**. Workflow :

```bash
# 1. Modifie prisma/schema.prisma

# 2. Crée la migration SQL à la main
mkdir prisma/migrations/$(date +%Y%m%d%H%M%S)_<name>
# Édite le migration.sql

# 3. Applique en prod
npx prisma migrate deploy

# 4. Régénère le client TS
npx prisma generate
```

---

## Documentation interne

- **`CLAUDE.md`** — guide développeur exhaustif (conventions, patterns, sécurités, gotchas)
- **`.env.example`** — chaque var avec son contexte et setup

---

## License

Privé — usage interne pour la CDM 26 (Coupe du Monde FIFA 26 sur Twitch).

# CDM 26 — Developer Guide

## What is this project?
CDM 26 est une plateforme Next.js de gestion de tournois esport pour la **Coupe du Monde FIFA 26 diffusée sur Twitch**. Elle gère les tournois (phase de poules + bracket d'élimination), les équipes/coachs/joueurs, les matchs (scores, streams), un système de **paris en pari mutuel placés depuis le site** (mises débitées sur les points de chaîne Twitch via l'API Wizebot), et l'authentification Clerk avec OAuth Twitch.

## Tech Stack
- **Framework**: Next.js 16 — **Pages Router** (PAS App Router)
- **Auth**: Clerk (middleware in `proxy.ts`, file is named `proxy.ts` not `middleware.ts`)
- **Database**: Prisma 7 + PostgreSQL (Supabase)
- **Storage**: Vercel Blob (logos d'équipes, avatars)
- **Streaming**: Twitch (OAuth user link uniquement — Clerk gère le lien)
- **Betting**: paris en pari mutuel placés depuis le site, débit/crédit sur les points de chaîne Twitch via l'API Wizebot
- **Styling**: Tailwind CSS 4 (oklch + `@theme inline`) + shadcn/ui + Magic UI
- **Animations**: Framer Motion + `motion/react`

---

## Architecture Conventions

### Routing model — Pages Router
Le projet utilise le **Pages Router** historique de Next.js. Conséquences :

- **Pas de Server Components** — toutes les pages sont client par défaut. `'use client'` n'est pas nécessaire.
- **Pas de `app/` directory**. Tout est dans `pages/`.
- **Data fetching côté serveur** via `getServerSideProps`, pas via async page components.
- **Routing** : `useRouter` vient de `next/router`, pas `next/navigation`.
- **API routes** : handlers `default export` avec `(req, res)` dans `pages/api/`. Pas de `route.ts` avec `GET`/`POST` exports.
- **Layout global** : `pages/_app.tsx` (pas `app/layout.tsx`).
- **Metadata** : `<Head>` de `next/head` (pas `export const metadata`).

### ⚠️ Server Actions en Pages Router — règle critique
**Les fonctions `'use server'` de `actions/` ne sont PAS appelables depuis du code client** (handlers `onClick`, `onSubmit`, `useEffect`…). Contrairement à App Router, Pages Router n'a pas l'infrastructure RSC pour invoquer une Server Action depuis le navigateur. Si tu importes une action server-side dans un handler client, le bundler Turbopack inclut **toute la chaîne** (Prisma, `pg`, `@clerk/nextjs/server`, `server-only`, `node:fs/net/tls/dns`) dans le bundle navigateur → erreur `'server-only' cannot be imported from a Client Component module` + `Module not found: 'net'`.

**Pattern correct** :

| Contexte | Comment appeler la logique serveur |
|----------|-----------------------------------|
| `getServerSideProps` (SSR) | `const { fn } = await import('@/actions/foo')` (dynamic import — empêche fuite dans le bundle client même en cas de tree-shaking imparfait) |
| Handler client (form submit, button click) | `fetch('/api/...')` vers une **API route** dans `pages/api/` |
| API route ou autre code server | Import statique direct des fonctions `actions/*` |

**Règle pratique** : si une fonction touche à `prisma`, `currentUser()`, `clerkClient`, ou tout `lib/` qui en dépend transitivement, **ne l'importe jamais en haut d'un fichier `pages/.../*.tsx`**. Soit dynamic import dans `getServerSideProps`, soit appel via `fetch` depuis une API route.

```tsx
// ❌ Bad — bundler embarque Prisma dans le bundle client
import { createTournament } from '@/actions/tournaments';
function Page() {
  const onSubmit = async () => {
    await createTournament(payload); // ⚠️ casse le build
  };
}

// ✅ Good — passe par une API route
function Page() {
  const onSubmit = async () => {
    const res = await fetch('/api/tournaments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };
}

// ✅ Good — dynamic import dans getServerSideProps
export const getServerSideProps: GetServerSideProps = async () => {
  const { getTournaments } = await import('@/actions/tournaments');
  const result = await getTournaments();
  return { props: { tournaments: JSON.parse(JSON.stringify(result.data ?? [])) } };
};
```

C'est aussi pourquoi des routes comme `pages/api/tournaments/create.ts` **existent en parallèle** des actions `createTournament()` dans `actions/tournaments.ts` : ce sont deux entrées (server-from-server vs client-from-browser), pas un duplicate à nettoyer.

### Pages (`pages/.../index.tsx`)
- **Garde les pages courtes** : `getServerSideProps` (fetch) + render. La logique métier descend dans `actions/`, des helpers `lib/utils/`, ou des hooks.
- **Pas de `getAuth()` dans `getServerSideProps` pour la protection** — le middleware `proxy.ts` redirige déjà vers `/sign-in` avant que la page se charge. À utiliser uniquement quand la **donnée** dépend de l'utilisateur (ex: `isAdmin` pour conditionnellement afficher un CTA).
- **Pas de `if (!userId) return { redirect: ... }`** — redondant avec le middleware.
- **Données issues de `actions/`**, jamais d'appels Prisma bruts dans les pages.
- **Sérialisation** : `JSON.parse(JSON.stringify(...))` pour les `Date` / `Decimal` Prisma avant `props`. Pattern récurrent dans `pages/tournaments/[id].tsx`.

```tsx
// ✅ Good
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const result = await getTournamentById(ctx.params!.id as string);
  if (!result.success) return { notFound: true };
  return { props: { tournament: JSON.parse(JSON.stringify(result.data)) } };
};

// ❌ Bad — auth check redondant + Prisma direct
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };
  const t = await prisma.tournament.findUnique({ where: { id: ctx.params!.id as string } });
  return { props: { t } };
};
```

### Actions (`actions/`)
- **Un fichier par domaine** : `tournaments.ts`, `teams.ts`, `players.ts`, `matches.ts`, `match-generation.ts`, `standings.ts`, `users.ts`, `statistics.ts`.
- **Toutes marquées `'use server'`** en tête de fichier.
- **Convention de retour** : `{ success: true, data }` / `{ success: false, error: string }`. Toujours wrapper dans un `try/catch` qui log l'erreur et renvoie un message FR pour l'utilisateur.
- **Validation** via `zod` schemas dans `lib/utils/validations.ts`.
- **Auth** : utilise `currentUser()` de Clerk en début d'action quand l'identité importe. Pour les pages, préfère `syncClerkUserFromReq(req)` dans `getServerSideProps`.
- **Barrel export** via `actions/index.ts`.

```ts
// actions/tournaments.ts
'use server';
export async function getTournamentById(id: string) {
  try {
    const data = await prisma.tournament.findUnique({ where: { id }, include: { ... } });
    if (!data) return { success: false, error: 'Tournoi introuvable' };
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return { success: false, error: 'Erreur lors de la récupération' };
  }
}
```

### API Routes (`pages/api/`)
Utilisées pour les **mutations déclenchées côté client** (form submits, fetch from React). Convention :

1. **Vérifier la méthode** : `if (req.method !== 'POST') return res.status(405).json(...)`.
2. **Auth** : `const { userId } = getAuth(req)` → 401 si absent.
3. **Sync DB** : `const dbUser = await syncClerkUserById(userId)` → 401 si introuvable.
4. **Permission** : `await isSiteAdmin(dbUser.id)` ou `canManageTeam`, etc., depuis `lib/utils/permissions.ts` → 403 si refusé.
5. **Validation body** : zod schema ou checks manuels FR.
6. **Mutation Prisma** + retour JSON `{ success: true, ... }` ou `{ error: '...' }`.

Les endpoints admin sont sous `pages/api/admin/`. Voir `pages/api/admin/promote-to-admin.ts` comme référence.

### Permissions (`lib/utils/permissions.ts`)
- **`isSiteAdmin(userId)`** : check `User.role === 'ADMIN'`.
- **`isTeamCoach(userId, teamId)`** : check `Team.coachUserId`.
- **`canManageTeam(userId, teamId)`** : admin OR coach.
- **`canManageMatch(userId, matchId)`** : admin OR coach d'une des 2 équipes.
- **`canAddSiteAdmin()`** : limit 5 admins max (utilisé par `promote-to-admin`).
- **Toujours** passer le **DB id** (pas le clerkId), via `syncClerkUserById(userId).id`.

### Clerk sync (`lib/clerk.ts`)
- **`syncClerkUserFromReq(req)`** : pour `getServerSideProps` — récupère + upsert le user DB depuis le clerkId de la session.
- **`syncClerkUserById(userId)`** : pour les API routes — même chose mais à partir d'un userId déjà extrait via `getAuth(req)`.
- **`syncClerkUser()`** : pour les Server Actions (utilise `currentUser()` côté serveur).
- Les 3 variantes **synchronisent automatiquement** : email, name, username, avatar, lien Twitch (via `extractTwitchFromClerkUser`), ET poussent `role + username` vers `Clerk.publicMetadata` quand la DB diverge — c'est ce qui permet `useUser().publicMetadata.role === 'ADMIN'` côté client.
- **Cas du switch Dev/Prod** : si l'email existe avec un autre clerkId, `upsertUserFromClerk` met à jour le clerkId au lieu de créer un duplicate.

### Webhooks Clerk (`pages/api/webhooks/clerk.ts`)
- Vérification svix obligatoire (signing secret = `CLERK_WEBHOOK_SECRET`).
- Events traités : `user.created`, `user.updated`, `user.deleted`.
- Le payload est en **snake_case** (`external_accounts`, `provider_user_id`) — utilise `extractTwitchFromClerkWebhook`, **pas** `extractTwitchFromClerkUser` (qui est pour le SDK camelCase).
- La route est dans la whitelist `isPublicRoute` du `proxy.ts`.

### Site betting (`lib/wizebot.ts` + `lib/utils/betting.ts` + `actions/markets.ts`)
- **Entrée unique** : UI cdm26.com (formulaire `PlaceBetForm` → POST `/api/bets/place` pour le 1X2, et POST `/api/markets/place` / `/api/markets/slip` pour les marchés flexibles). **Plus de commande `!parier` dans le chat** — l'inbound Wizebot a été supprimé.
- **Monnaie** : points de chaîne Twitch gérés par Wizebot.
  - **Débit** : `debitWizebotPoints({ twitchUsername, amount, reason })` est appelé par l'API route AVANT la création du Bet. Si le débit échoue (solde insuffisant, réseau), l'API renvoie une erreur et aucun pari n'est créé.
  - **Crédit** : `creditWizebotPoints({ twitchUsername, amount, reason })` crédite les gagnants au settlement.
  - **Mocké en dev** si la config manque (`WIZEBOT_API_KEY`, `WIZEBOT_CHANNEL`), **erreur explicite en prod**.
- **Twitch lié obligatoire** : un user qui veut parier DOIT avoir `User.twitchUsername` set (sinon les API routes renvoient `NO_TWITCH_LINK`). Le lien est posé via Clerk OAuth ou saisie manuelle sur `/profile`.
- **Pari mutuel** : aucune cote stockée. Les odds sont calculées dynamiquement depuis `MatchBettingPool` via `computeLiveOdds(pool)` — formule `(total / poolX) × (1 - housePercentage/100)`.
- **Verrouillage** : `isBettingOpen(match)` = `SCHEDULED && now < matchDate` OU `LIVE && now < matchDate + 25min` (fenêtre live betting). Pas de flag stocké.
- **Idempotence Wizebot** : `Bet.wizebotEventId` reste `@unique` (legacy — utilisable pour des retry futurs). En pratique le débit Wizebot est synchrone, on n'en a plus besoin pour bloquer les doublons.
- **Settlement** : `settleMatchBets({matchId, outcome})` est appelé fire-and-forget depuis `pages/api/matches/[id]/submit-result.ts`. Si le crédit Wizebot échoue, le bet est marqué `CREDIT_FAILED` et `retryFailedCredits()` peut le rejouer plus tard via `pages/api/admin/bets/retry-failed.ts`.

### File Storage (`lib/save-file-and-images.ts`)
- **`saveUploadedFileToBlob(file, userId, folder?)`** : upload vers Vercel Blob.
- Compression auto via Sharp en **WebP quality 80** pour `image/jpeg | image/png | image/webp`.
- Autres fichiers (PDF, CSV…) uploadés tels quels avec leur content-type.
- Path final : `/${folder}/${userId}-${timestamp}-${sanitizedName}.${ext}`. Pas de `addRandomSuffix` (déjà unique avec userId+timestamp).
- **Hook client** : `hooks/use-image-upload.ts` enveloppe l'upload + retourne `{ url, pathname }`.

---

## Security Rules

### API Routes
- **Toujours** vérifier la méthode → `405` sur mismatch.
- **Toujours** appeler `syncClerkUserById(userId)` puis check de rôle avant mutation.
- **Permissions par domaine** : `isSiteAdmin` / `isTeamCoach` / `canManageMatch` — pas de check ad-hoc inline.
- **Validation body** : zod schemas dans `lib/utils/validations.ts` quand le payload a une structure stable.
- **Idempotence** : pour les opérations financières (paris, crédits), utiliser un identifiant unique (`wizebotEventId`).

### Webhooks
- **Clerk** : signature svix vérifiée via `wh.verify()`. Ne jamais skip.
- (Pas d'inbound Wizebot — les paris ne passent plus par le chat.)

### Twitch Linking
- Le lien Twitch est **requis pour parier** : c'est sur ce compte que Wizebot débite/crédite les points de chaîne.
- Le lien Twitch a **deux modes** :
  1. **OAuth-linked** (`twitchUserId` non-null) : géré par Clerk webhook → DB. Read-only depuis le profil. L'utilisateur doit délier via Clerk pour le modifier.
  2. **Manual** (`twitchUsername` seul) : fallback pour ceux qui n'ont pas Twitch dans Clerk. L'API `pages/api/profile/update.ts` rejette une modif manuelle si `twitchUserId` est set.
- **Distinction "champ absent" vs "vide"** dans `pages/api/profile/update.ts` : on utilise `Object.prototype.hasOwnProperty.call(req.body, 'twitchUsername')` pour différencier "ne pas toucher" (champ absent) de "effacer" (`null`/`""`).

---

## Key Files

| File | Purpose |
|------|---------|
| `proxy.ts` | Clerk middleware (NOT `middleware.ts`). Whitelist : `/`, `/sign-in*`, `/sign-up*`, `/api/webhooks*` |
| `lib/clerk.ts` | `syncClerkUser*` (3 variantes) + extracteurs Twitch SDK/Webhook |
| `lib/auth/page-auth.ts` | `getCurrentDbUserFromReq` — helper SSR pour récupérer le User DB |
| `lib/utils/permissions.ts` | `isSiteAdmin`, `isTeamCoach`, `canManageTeam`, `canManageMatch`, `canAddSiteAdmin` |
| `lib/wizebot.ts` | Outbound debit/credit Wizebot + normalize/validate Twitch usernames (plus d'inbound) |
| `lib/utils/betting.ts` | `computeLiveOdds`, `isBettingOpen`, `placeBet`, `settleMatchBets`, `retryFailedCredits` |
| `lib/utils/validations.ts` | zod schemas (tournamentSchema, etc.) |
| `lib/utils/bracket-generator.ts` | Génération du bracket d'élimination depuis les standings |
| `lib/utils/group-match-generator.ts` | Génération des matchs de poules (round-robin évitant les confrontations intra-groupe) |
| `lib/utils/standings.ts` | Calcul du classement + tie-breakers |
| `lib/utils/tournament-stats.ts` | Aggregations stats par tournoi |
| `lib/save-file-and-images.ts` | Upload Vercel Blob + compression WebP via Sharp |
| `lib/prisma.ts` | Singleton Prisma |
| `actions/index.ts` | Barrel export des Server Actions |
| `pages/api/webhooks/clerk.ts` | Sync user.created/updated/deleted + lien Twitch |
| `pages/api/bets/place.ts` | Endpoint placement pari 1X2 (depuis le site → débit Wizebot → `placeBet`) |
| `pages/api/markets/place.ts` / `slip.ts` | Endpoints marchés flexibles (score exact, total buts, BTTS, top buteur, MVP, vainqueur) + combinés |
| `pages/api/admin/bets/retry-failed.ts` | Rejoue les crédits Wizebot tombés en `CREDIT_FAILED` |
| `pages/api/matches/[id]/submit-result.ts` | Soumission score + trigger `settleMatchBets` |
| `prisma/schema.prisma` | Modèles : User (Clerk + Twitch), Tournament, Group, Team, Player, Match, Standing, MatchBettingPool, Bet, BettingMarket, MarketPool, MarketBet, BetSlip, MatchEvent, Webhook |

---

## Frontend Conventions

### Reference Implementation
- **Pages tournaments** (`pages/tournaments/index.tsx`, `[id].tsx`, `new.tsx`) sont la référence pour le style CDM 26. Suivre les mêmes patterns : Hero avec `bg-mesh-cdm` + `text-gradient-worldcup`, Cards shadcn + BorderBeam au hover, Tabs shadcn pour la navigation interne, NumberTicker pour les stats.
- **Landing** (`pages/index.tsx` + `components/landing/*`) est la référence pour les sections marketing (orbiting circles, globe, marquees, testimonials).
- **Header / nav** : `components/layout/modern-header.tsx` (NavigationMenu shadcn + Sheet mobile + brand `text-gradient-worldcup`).

### Component Structure
- **`components/ui/`** : shadcn/ui components + Magic UI primitives (`border-beam`, `globe`, `orbiting-circles`, `ripple`, `number-ticker`, `shimmer-button`, `marquee*`, `three-d-marquee`, `apple-hello-effect`, `animated-testimonials`, `card-3d`, `avatar-group`).
- **`components/layout/`** : `modern-header.tsx`, `main-layout.tsx`, footer.
- **`components/landing/`** : sections de la home (`hero-cdm26`, `live-twitch-strip`, `feature-bento`, `tournament-format-timeline`, `teams-orbit`, `streamers-grid`, `cta-final`, `floating-balls`).
- **`components/tournament/`** : `standings-table`, `bracket-view`, `match-list`, `teams-list`, `generate-matches-button`, `complete-group-stage-button`, `tournament-statistics`.
- **`components/admin/`**, **`components/match/`**, **`components/user/`**, **`components/support/`** : composites par domaine.
- **Avant de créer un component**, check `components/ui/` et `components/[domaine]/` — la plupart existent déjà.

### Design System CDM 26
- **Palette World Cup** :
  - Vert pelouse `emerald-500/600` (gazon, statut "actif")
  - Or trophée `yellow-500` / `amber-500` (Sparkles, accents)
  - Rouge passion `red-500/600` (LIVE, alertes, accents)
  - Purple `purple-500/600` (phase finale, branding Twitch via `#9146ff`)
- **Classes globales** (dans `styles/globals.css`) :
  - `.text-gradient-worldcup` : gradient text vert→or→rouge
  - `.text-gradient-twitch` : gradient text purple Twitch
  - `.bg-mesh-cdm` : background mesh subtil pour les heros
  - `.bg-aurora` : aurora animée pour les sections premium
  - `.live-dot` : pastille rouge pulsante
- **Keyframes custom** : `gradient-shift`, `float-y`, `glow-pulse`, `pulse-ring`, `aurora`.
- **Hero pattern récurrent** :
  ```tsx
  <section className="relative overflow-hidden border-b border-border/60">
    <div className="absolute inset-0 bg-mesh-cdm opacity-40" />
    <div className="absolute inset-0 bg-linear-to-b from-background/0 via-background/40 to-background" />
    <div className="relative container mx-auto px-4 py-14 md:py-20">
      <h1 className="text-5xl md:text-7xl font-black">
        <span className="text-gradient-worldcup">Titre</span>
      </h1>
    </div>
  </section>
  ```

### UI/UX
- **Toujours** utiliser shadcn/ui — `Button`, `Card`, `Input`, `Label`, `Tabs`, `Badge`, `Sheet`, `NavigationMenu`, `Dialog`, `AlertDialog`, `Select`, `Tooltip`, etc. **Pas** de natif `<select>`, `<input>`, `<dialog>`.
- **Stats** : utiliser `<NumberTicker value={n} />` au lieu d'afficher un nombre brut. Animation gratuite.
- **CTA premium** : `<ShimmerButton background="linear-gradient(135deg, #059669 0%, #ca8a04 50%, #dc2626 100%)" shimmerColor="#fbbf24">` — gradient World Cup.
- **Cards interactives** : ajouter `<BorderBeam>` au hover (opacity-0 → group-hover:opacity-100), couleurs `colorFrom="#10b981" colorTo="#facc15"`.
- **Status badges** : utiliser `<Badge>` shadcn avec tons cohérents :
  - **Live** : `bg-red-500/10 text-red-600 border-red-500/30` + dot pulse
  - **Phase finale** : `bg-purple-500/10 text-purple-600 border-purple-500/30` + Crown icon
  - **À venir** : `bg-blue-500/10 text-blue-600 border-blue-500/30` + Hourglass icon
- **`next/image`** pour les assets statiques (`/logo.png`, illustrations sur Vercel Blob côté brand).
- **`<img>` natif** pour le contenu user-generated (logos d'équipes uploadés) — évite la facturation Vercel Image Optimization.
- **Framer Motion** : transitions d'entrée (`initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`), hover scale, layoutId pour les indicators de tabs. Ne pas en abuser.
- **Toast** : `sonner` via `import { toast } from 'sonner'`. Messages FR concis.

### Filtres / Tabs
- **Filter pattern** (cf. `pages/tournaments/index.tsx`) : shadcn `<Tabs>` rond pill, sync avec `?filter=...` query param via `useEffect` qui lit `router.query.filter`.

---

## Database

### Prisma
- **Singleton** dans `lib/prisma.ts` — évite les fuites de connexion en dev hot reload.
- **`DATABASE_URL`** = pooler Supabase port 6543 + `?pgbouncer=true` — utilisé par l'app en runtime.
- **`DIRECT_URL`** = direct port 5432 — utilisé par `prisma migrate deploy` (PgBouncer bloque les commandes prepared statements de migrate).
- **Shadow DB désactivée** chez Supabase pooler → ne pas utiliser `prisma migrate dev`. Écrire les migrations à la main dans `prisma/migrations/<timestamp>_<name>/migration.sql` puis `prisma migrate deploy`.
- **Toujours `select`** sur les queries quand seul un sous-ensemble de champs est nécessaire.
- **Modèles importants** : User (Clerk-linked + Twitch), Tournament, Group, Team (avec `coachUserId`), Player, Match (stages: GROUP / PLAYOFF / R16 / QF / SF / FINAL), Standing, MatchBettingPool (1-1 avec Match), Bet (idempotence via `wizebotEventId @unique`).

### Migrations
- Si Supabase refuse le shadow DB :
  1. Modifier `prisma/schema.prisma`.
  2. Créer manuellement `prisma/migrations/YYYYMMDDHHMMSS_<name>/migration.sql`.
  3. `npx prisma migrate deploy` (utilise `DIRECT_URL`).
  4. `npx prisma generate` pour régénérer le client.

### Dev Tools
- **`prisma/seed.ts`** : seed CDM 26 (un tournoi d'exemple, équipes, etc.).
- **Resync Clerk metadata** : si on modifie un rôle directement en DB (Supabase Studio), Clerk ne sait rien. Endpoint `POST /api/admin/users/resync-clerk` pour pousser DB → Clerk publicMetadata, puis sign out / sign in pour rafraîchir le JWT client.

---

## Environment Variables
Voir `.env.example` pour la liste complète. Sections obligatoires :

1. **Clerk** : `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` + URLs sign-in/up.
2. **Supabase** : `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432).
3. **Vercel Blob** : `BLOB_READ_WRITE_TOKEN`.
4. **Wizebot** (outbound uniquement) : `WIZEBOT_API_KEY`, `WIZEBOT_CHANNEL` (lowercase). En dev, l'absence des deux mock les appels — pas d'erreur. En prod, c'est requis.
5. **App** : `NEXT_PUBLIC_APP_URL`.

En dev, l'absence des vars Wizebot mock les appels outbound. En prod, c'est une erreur explicite.

---

## Don't

- Don't put auth checks in `getServerSideProps` for redirection — `proxy.ts` middleware does that.
- Don't put raw Prisma calls in pages — use `actions/`.
- Don't fetch data in `useEffect` on mount — pass via `getServerSideProps` props.
- Don't use **App Router** patterns (`route.ts`, `metadata` export, async page components, `next/navigation`) — this is **Pages Router**.
- Don't hardcode `'use client'` — Pages Router has no Server Components, the directive is a no-op.
- Don't store Twitch OAuth tokens or scrape Twitch directly — Clerk handles OAuth, Wizebot only acts as the points wallet (debit/credit API).
- Don't store external URLs in DB if they expire — upload to Vercel Blob first via `saveUploadedFileToBlob`.
- Don't use `next/image` for user-uploaded team logos — `<img>` only (cost optimization).
- Don't use native `<select>`, `<input>`, `<dialog>` — use shadcn/ui equivalents.
- Don't run `prisma migrate dev` against Supabase pooler — it requires shadow DB. Write migration SQL by hand and `prisma migrate deploy`.
- Don't bypass `syncClerkUser*` — it's the bridge that keeps DB ↔ Clerk metadata in sync (role, username, Twitch link). Modifying DB directly without it = Clerk publicMetadata stale.
- Don't store betting odds — they are computed live from `MatchBettingPool` totals.
- Don't trust manual changes to `User.role` in Supabase — push to Clerk via `POST /api/admin/users/resync-clerk` then sign out / sign in.
- Don't expose `WIZEBOT_API_KEY` client-side — server-only env var (no `NEXT_PUBLIC_` prefix).
- Don't reintroduce a chat-side `!parier` command or an inbound Wizebot webhook — paris se font UNIQUEMENT depuis le site.
- Don't run `npm run build` unless explicitly asked.
- Don't add features, refactor, or introduce abstractions beyond what the task requires. Three similar lines is better than a premature abstraction.
- Don't create planning, decision, or analysis markdown files unless asked. Work from conversation context.

# Basement Lab (`jmwhosh04/basementapp`)

## What Was Updated
- **Mandatory Login Gate Before Hub (`index.html` & `basement-lab-app.html`):** Unauthenticated visitors are held on a dedicated sign-in screen (`Sign in to enter your Hub`) rather than landing on an empty or unauthenticated Hub view.
- **Session Hydration & Multi-User Isolation (`basement-db.js`):** Waits for `authReady` before rendering protected views, prevents duplicate session hydration (`_isHydrating` / `_hydratedUserId`), snapshots and restores per-user local cache on account switch/sign-out, and keeps shared `custom_catalog` items merged non-destructively.
- **Direct Standalone Guard (`module-auth-guard.js`):** Redirects unauthenticated direct hits on standalone module URLs back to `./index.html`.
- **Supabase Row Level Security (`sql/rls_policies.sql`):** Enforces `auth.uid() = user_id` across `coach_contexts`, `workout_logs`, `cardio_logs`, and `sauna_logs`, while enabling authenticated reads/writes on `custom_catalog` and public reads on `exercise-images`.

## Supabase Setup for `basement-lab`
1. **Project URL:** Pre-configured in `index.html` and `basement-lab-app.html` as `https://flroxptovfxuzwpoyisf.supabase.co`.
2. **Publishable Key:** Pre-configured in `index.html` and `basement-lab-app.html` as `sb_publishable_tsAgCyDK0xMchdMW4lH8BA_rys4KouJ`.
3. Run `sql/rls_policies.sql` in your Supabase SQL Editor.
4. Commit and push to your GitHub repository (`jmwhosh04/basementapp`).

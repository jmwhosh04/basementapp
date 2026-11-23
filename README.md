# 🏋️‍♂️ Basement Lab · AI Personal Trainer & Home-Gym Suite

A mobile-first (`max-w-md`), 4-module AI personal training, voice coaching, and performance analytics web app built for a home gym (`≤50 lb` dumbbells, resistance bands, adjustable bench, treadmill, rower, and traditional sauna).

**Live App:** [https://jmwhosh04.github.io/basementapp/](https://jmwhosh04.github.io/basementapp/)

---

## 🏗️ Repository Architecture

The suite uses a lightweight **Master Shell + Auth Guard + Cloud Sync Adapter + 4 Standalone Modules** layout hosted on GitHub Pages:

| File | Role |
| :--- | :--- |
| **`index.html` & `basement-lab-app.html`** | **Master Suite Shell & Login Gate:** Mobile `max-w-md` wrapper that enforces authentication (`Sign in to enter your Hub`) before rendering the Hub or any module, provides a persistent 4-tab bottom dock (`1. Hub`, `2. Profile`, `3. Catalog`, `4. Trainer`), and connects to Supabase (`https://flroxptovfxuzwpoyisf.supabase.co`). |
| **`basement-db.js`** | **Supabase Auth, Session Hydration & Cloud Sync Adapter:** Manages `authReady` session resolution, Google OAuth & email sign-in/out, duplicate-hydration guards, per-user local cache isolation on account switch/sign-out, and cloud synchronization. |
| **`module-auth-guard.js`** | **Standalone Module Guard:** Redirects unauthenticated direct hits on standalone module URLs back to `./index.html`. |
| **`sql/rls_policies.sql`** | **Supabase Schema & Row Level Security:** Defines user-scoped tables, shared `custom_catalog` policies, RLS rules (`auth.uid() = user_id`), and `exercise-images` storage policies. |
| **`basement-hub-circuit.html`** | **Module 1 · Daily Hub & Circuit Coach:** Pro Trainer daily recommendation engine, anti-overload circuit synthesis, guided Step 0 warm-up & active circuit player with Time Under Tension (`durationSec` / `secPerRep`) capture, 30-min cardio clocks, post-workout sauna logging (`Didn't Sauna` skip UX), and consistency calendar. |
| **`basement-coach-profile.html`** | **Module 2 · Coach Context & Goals Engine:** Clean-slate per-user onboarding (**Tell Me About You** AI voice/text interview), primary & optional secondary goals (with add/remove), 50-lb dumbbell cap progression modes, expiring acute injuries, Life & DOMS voice/manual tracking, and AI conflict simulator. |
| **`basement-catalog.html`** | **Module 3 · Smart Catalog & Visual Form Coach:** Home-gym exercise library with 2-stage human photos (`free-exercise-db`), AI 2-stage photo generation, custom lift mapping, and `Zephyr` voice exercise coaching. |
| **`basement-analytics.html`** | **Module 4 · AI Pro Trainer & Performance Lab:** Multi-horizon AI Pro Trainer audit (`basement_trainer_directives`), Brzycki E1RM progression curves, readiness & correlation analytics, and pre/post-workout voice notes. |

---

## 🔐 Multi-User Cloud Sync (Supabase + Google OAuth)

All user data is isolated per account using **Supabase Row Level Security (`auth.uid() = user_id`)** and per-user local cache snapshots (`basement_user_cache_<userId>`) so switching accounts or signing out never exposes another user's active state:

* **`coach_contexts`**: Per-user profile, goals, injuries, limits, and trainer settings (`user_id` primary key).
* **`workout_logs`**, **`cardio_logs`**, **`sauna_logs`**: User-owned training and recovery logs scoped to `auth.uid() = user_id`.
* **`custom_catalog`**: Custom exercises and 2-stage photo overrides merged non-destructively across authenticated users.

### Shared `localStorage` Keys
Modules read and write to shared origin `localStorage` keys, which `basement-db.js` isolates per user and mirrors to Supabase:
* `basement_coach_context`
* `basement_active_goal`
* `basement_temp_injuries`
* `basement_limits`
* `basement_logs`
* `basement_cardio_logs`
* `basement_sauna_logs`
* `basement_custom_catalog`
* `basement_trainer_directives`
* `basement_trainer_notes`
* `basement_gemini_api_key`

---

## 🛡️ Built-In Training & Hardware Guardrails

* **50.0 lb Dumbbell Ceiling:** Scales progression via tempo/pause, unilateral upgrades, or band + dumbbell combos once a movement hits 50 lb.
* **Consecutive-Day Caps:** Enforces a maximum of 2 consecutive lifting days and 48-hour recovery between running sessions.
* **30-Minute Cardio Clocks:** Keeps Step 0 mobility warm-ups outside the 30-minute run/row timer.
* **Photographic Form Standards:** Uses 2-stage human demonstrations (`free-exercise-db` or AI-generated imagery) with zero stick-figure placeholders.

---

## 🚀 Setup & Deployment

1. **GitHub Pages:** In repository **Settings → Pages**, set **Source** to **Deploy from a branch** (`main`, `/ (root)`).
2. **Supabase & Google OAuth:** Project URL (`https://flroxptovfxuzwpoyisf.supabase.co`) and publishable key (`sb_publishable_tsAgCyDK0xMchdMW4lH8BA_rys4KouJ`) are configured in the shell files. Run `sql/rls_policies.sql` in the Supabase SQL Editor, enable the **Google** auth provider in Supabase, and add `https://jmwhosh04.github.io/basementapp/**` to Supabase **Redirect URLs**.
3. **Gemini API Key:** Sign in to the live app, tap **💾** in the top bar, and paste a free-tier key from [Google AI Studio](https://aistudio.google.com/apikey) (kept in local/user state—never committed to GitHub).
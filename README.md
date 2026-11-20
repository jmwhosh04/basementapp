# 🏋️‍♂️ Basement Lab · AI Personal Trainer & Home-Gym Suite

A mobile-first (`max-w-md`), 4-module AI personal training, voice coaching, and performance analytics web app built for a home gym (`≤50 lb` dumbbells, resistance bands, adjustable bench, treadmill, rower, and traditional sauna).

**Live App:** [https://jmwhosh04.github.io/basementapp/](https://jmwhosh04.github.io/basementapp/)

---

## 🏗️ Repository Architecture

The suite uses a lightweight **Master Shell + Cloud Sync Adapter + 4 Standalone Modules** layout hosted on GitHub Pages:

| File | Role |
| :--- | :--- |
| **`index.html`** | **Master Suite Shell:** Mobile `max-w-md` wrapper with Google Sign-In gate, persistent 4-tab bottom dock (`1. Hub`, `2. Profile`, `3. Catalog`, `4. Trainer`), `localStorage` cross-module sync, Master JSON Backup/Restore, and Gemini API key manager. |
| **`basement-db.js`** | **Supabase Auth & Cloud Sync Adapter:** Handles Google OAuth sign-in/out, pulls per-user cloud data into `localStorage` on login, and auto-syncs local changes back to Supabase every 3 seconds. |
| **`basement-hub-circuit.html`** | **Module 1 · Daily Hub & Circuit Coach:** Pro Trainer daily recommendation engine, anti-overload circuit synthesis, guided Step 0 warm-up & active circuit player with Time Under Tension (`durationSec` / `secPerRep`) capture, 30-min cardio clocks, post-workout sauna logging (`Didn't Sauna` skip UX), and consistency calendar. |
| **`basement-coach-profile.html`** | **Module 2 · Coach Context & Goals Engine:** Clean-slate per-user onboarding (**Tell Me About You** AI voice/text interview), primary & optional secondary goals (with add/remove), 50-lb dumbbell cap progression modes, expiring acute injuries, Life & DOMS voice/manual tracking, and AI conflict simulator. |
| **`basement-catalog.html`** | **Module 3 · Smart Catalog & Visual Form Coach:** Home-gym exercise library with 2-stage human photos (`free-exercise-db`), AI 2-stage photo generation, custom lift mapping, and `Zephyr` voice exercise coaching. |
| **`basement-analytics.html`** | **Module 4 · AI Pro Trainer & Performance Lab:** Multi-horizon AI Pro Trainer audit (`basement_trainer_directives`), Brzycki E1RM progression curves, readiness & correlation analytics, and pre/post-workout voice notes. |

---

## 🔐 Multi-User Cloud Sync (Supabase + Google OAuth)

All user data is isolated per Google account using **Supabase Row Level Security (`auth.uid() = user_id`)**:

* **`user_state`**: Per-user profile, goals, injuries, limits, trainer directives, and saved Gemini API key (`basement_gemini_api_key`).
* **`strength_logs`**, **`cardio_logs`**, **`sauna_logs`**, **`trainer_notes`**: Append-only training and recovery logs isolated per `user_id`.
* **`custom_catalog`**: Custom exercises and 2-stage photo overrides (supports sharing across household accounts while restricting edits to `owner_id`).

### Shared `localStorage` Keys
All 4 modules read and write to the same origin `localStorage` keys, which `basement-db.js` mirrors to Supabase:
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
2. **Supabase & Google OAuth:** Configure the Supabase project URL and publishable (`anon`) key in `basement-db.js`, enable the **Google** auth provider in Supabase, and add `https://jmwhosh04.github.io/basementapp/**` to Supabase **Redirect URLs**.
3. **Gemini API Key:** Sign in to the live app, tap **💾** in the top bar, and paste a free-tier key from [Google AI Studio](https://aistudio.google.com/apikey) (stored in your private Supabase `user_state` row—never committed to GitHub).

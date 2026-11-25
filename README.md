# Basement Lab (`jmwhosh04/basementapp`)

## Architecture & Modules
- **Canonical Entry Point (`index.html`):** Master suite wrapper with authentication gating, Gemini AI key modal (`🔑 AI Key`), and bottom navigation (`1. Hub`, `2. Profile`, `3. Catalog`, `4. Trainer`).
- **Module 1 — Daily Hub, Guided Player & Calendar (`basement-hub-circuit.html`):** Pre-workout check-in and 6-zone soreness selector, modality switcher (`Lift Circuit`, `Run (30m)`, `Row (30m)`), AI-assisted circuit & blind-spot discovery, station swap drawer, full-screen manual circuit builder, step-by-step/round-by-round guided player with TUT & rest timers, post-workout debrief, and monthly calendar/loggers.
- **Module 2 — Coach Context & Goals Engine (`basement-coach-profile.html`):** AI profile interview, primary & secondary goal configuration, mesocycle phase, 50-lb dumbbell cap progression mode, exercise favorites/bans, expiring temporary injuries, baseline anthropometrics, real-life physical loads, toggleable chronic guardrails & training preferences, and AI conflict simulator.
- **Module 3 — Smart Catalog & Visual Form Coach (`basement-catalog.html` & `basement-exercises.js`):** 140-exercise home-gym catalog with `yuhonas/free-exercise-db` 2-stage photo lookup/picker, custom URL/AI image support, voice AI exercise coach, and custom exercise creation.
- **Module 4 — AI Pro Trainer & Performance Lab (`basement-analytics.html`):** Multi-horizon trainer coaching assessment, follow-up Q&A, goal block roadmap & auto-mesocycle progression, 7-day vs. 42-day rollups, Brzycki E1RM chart, and 8-hypothesis A/B correlation scanner.
- **Data Bus, Auth & AI Helpers (`basement-db.js`, `basement-ai.js`, `module-auth-guard.js`, `rls_policies.sql`):** Supabase auth/session hydration, non-destructive cloud sync with deletion tombstones, voice dictation (`3000ms` silence debounce) & TTS helpers, and Row Level Security SQL schema (`rls_policies.sql`).

## Supabase Setup
1. **Project URL:** `https://flroxptovfxuzwpoyisf.supabase.co`
2. **Publishable Key:** `sb_publishable_tsAgCyDK0xMchdMW4lH8BA_rys4KouJ`
3. Run `rls_policies.sql` in your Supabase SQL Editor if you need to set up or verify tables and RLS policies.

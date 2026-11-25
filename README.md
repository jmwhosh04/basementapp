# Basement Lab (`jmwhosh04/basementapp`)

## What Was Hardened
- **Canonical Entry Point (`index.html`):** Consolidated duplicate app shells so `index.html` is the single master suite wrapper (`basement-lab-app.html` removed).
- **Gemini AI Key Manager (`basement-ai.js` & `index.html`):** Added a `🔑 AI Key` button in the top header of `index.html` so you can save or clear your `basement_gemini_api_key` locally in the browser, shared across all 4 modules with clean offline/deterministic fallbacks.
- **Non-Destructive Cloud Sync & Promise-Coalesced Hydration (`basement-db.js`):** Replaced broad remote-row diffs with explicit deletion tombstones (`markRecordDeleted`), coalesced concurrent `hydrateUserFromCloud` calls, and added `QuotaExceededError` eviction protection in `writeJson`.
- **Supabase Schema & RLS Alignment (`sql/rls_policies.sql`):** Aligned table names, columns, composite primary keys, and Row Level Security policies 1:1 with `basement-db.js` (`strength_logs`, `cardio_logs`, `sauna_logs`, `trainer_notes`, `custom_catalog`, `user_state`).
- **Consistent Auth Guard (`basement-catalog.html` & `module-auth-guard.js`):** Added `module-auth-guard.js` to `basement-catalog.html` and wired `BasementAI` across all modules.

## Supabase Setup
1. **Project URL:** `https://flroxptovfxuzwpoyisf.supabase.co`
2. **Publishable Key:** `sb_publishable_tsAgCyDK0xMchdMW4lH8BA_rys4KouJ`
3. Run `sql/rls_policies.sql` in your Supabase SQL Editor if you need to recreate or verify tables and RLS policies.
4. Commit and push all files in this archive to `jmwhosh04/basementapp`.

# 🏋️‍♂️ Basement Lab · AI Personal Trainer & Home-Gym Suite

A mobile-first, 4-module AI personal training, voice coaching, and performance analytics suite built for a home gym (`≤50 lb` dumbbells, resistance bands, adjustable bench, treadmill, rower, and traditional Finnish sauna).

---

## 🏗️ Modular 5-File Architecture (Zero Bloat)

This repository uses a lightweight **Master Shell + 4 Standalone Modules** architecture so no single HTML file becomes bloated, while all modules stay synchronized in real time via a shared `localStorage` data bus:

| File in Repository | Role & Responsibility |
| :--- | :--- |
| **`index.html`** *(or `basement-lab-app.html`)* | **Master Suite Shell (~240 lines):** Lightweight mobile wrapper with the persistent 4-tab bottom navigation dock (`1. Hub`, `2. Profile`, `3. Catalog`, `4. Trainer`), live cross-module `localStorage` sync, Master JSON Backup/Restore, and local `🔑 Gemini API Key` manager. |
| **`basement-hub-circuit.html`** | **Module 1 · Daily Hub & Circuit Coach:** Pre-workout voice check-in gate (`🎤 Today's Update` vs. `Nothing to Update`), anti-overload circuit synthesis, guided Step 0 & circuit player, post-workout congratulations lock with voice debrief (`🎤 Anything I Need to Know?`), and consistency calendar. |
| **`basement-coach-profile.html`** | **Module 2 · Coach Context & Goals Engine:** Athlete baseline (`46y, 5'11", 215 lb`), 2–3 month Primary Goal (`~70%`) + optional Secondary Maintenance Goal (`~30%` or `None`), weekly schedule (`3–6 days/wk`, `20–50m`), expiring acute injuries, and voice-enabled ongoing guardrails (`Shin Splints`, `Plantar Fasciitis`, `Desk Job`). |
| **`basement-catalog.html`** | **Module 3 · Smart Catalog & Visual Form Coach:** 24+ home-gym exercises with side-by-side 2-stage human photos (`1. Setup` & `2. Peak`), live 873-exercise photo picker, AI 2-stage photo generator, and in-card `🗣️ Voice AI Exercise Coach` (`Zephyr` TTS) right above the full setup/steps/traps breakdown. |
| **`basement-analytics.html`** | **Module 4 · AI Pro Trainer & Performance Lab:** Multi-horizon Pro Trainer Clipboard (`7d / 6w / 12w`), spoken follow-up Q&A, Pre/Post-Workout Voice Notes log, Goal Block Graduation Advisor, interactive `<svg>` Brzycki E1RM curve, and Dynamic 8-Factor A/B Correlation Scanner. |

### 🔗 Shared `localStorage` Data Bus
All modules read and write to the same origin storage keys:
* `basement_coach_context` — Athlete profile, goals, schedule, ongoing guardrails, and Step 0 primers.
* `basement_logs` / `basement_cardio_logs` / `basement_sauna_logs` — Strength sets, Run/Row telemetry (`Resistance 1–30`), and Traditional Sauna sessions.
* `basement_trainer_notes` — Timestamped Pre-Workout and Post-Workout voice check-ins and debriefs.
* `basement_custom_catalog` — Custom exercises, 2-stage photo overrides, and custom Quick Cues.
* `basement_trainer_directives` — Closed-loop Pro Trainer auto-injections (`TRAINER AUTO-FIX` / `TRAINER AUTO-ADD`) and RPE calibrations.
* `basement_gemini_api_key` — Device-local Gemini API key for live AI coaching and natural `Zephyr` TTS voice playback (never committed to GitHub).

---

## 🚀 How to Publish on GitHub Pages

1. Upload **`index.html`** (renamed from `basement-lab-app.html`) and the 4 module files (**`basement-hub-circuit.html`**, **`basement-coach-profile.html`**, **`basement-catalog.html`**, **`basement-analytics.html`**) to the root of your GitHub repository.
2. Go to **Settings** $\rightarrow$ **Pages** in your GitHub repository.
3. Under **Build and deployment** $\rightarrow$ **Branch**, select **`main`** and **`/ (root)`**, then click **Save**.
4. Open your live URL (`https://<your-username>.github.io/<repo-name>/`) on your phone, tap **Share $\rightarrow$ Add to Home Screen**, and enter your Gemini API key inside **`💾 Data & 🔑 Key
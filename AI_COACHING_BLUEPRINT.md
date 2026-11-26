# Basement Lab · AI Strategy & Coaching Blueprint (`AI_COACHING_BLUEPRINT.md`)

**Overarching Goal:** Keep you healthy, consistent, progressing within your home-gym equipment envelope, and injury-free over the long term.

---

## 1. How AI & Guardrails Work Together

Basement Lab pairs **Live Gemini AI Coaching** (judgment, synthesis, context-aware adaptation, and voice guidance) with **Deterministic Safety & Math Guardrails** (hardware limits, spacing rules, and exact workload math) so you get intelligent personal training without risky AI hallucinations or slow/broken math.

### What Live Gemini AI Owns (Coaching & Adaptation)
- **Daily Circuit, Weight, Tempo & Rest Architecture (`1. Hub`):** Looks across your recent strength logs (including RPE, `durationSec` Time-Under-Tension, `selectionSource`, and prescribed-vs-actual weight/rep/RPE overrides), recent cardio, active goals, chronic guardrails, 6-zone soreness, and pre-workout check-in note to sequence a locked 6–7 station circuit (`✨ AI COACHED`) that cycles cleanly across all 3 rounds without mid-workout drift, calibrate per-station loads (automatically adapting down when you dial a weight lower while still hitting target RPE), reps, tempo, and rest timers (`25–90s`), present a compact Day-2 muscle focus banner (`Yesterday` vs. `Today` muscle zones), and deliver a conversational, exercise-free trainer rationale (`🧠 Why Today Matters` / `Why This Workout?`) explaining why today matters, what to focus on, and how it builds off recent days.
- **AI New Exercise Introduction (`✨ AI NEW`):** Can introduce 1–2 new movements outside the base catalog when biomechanically superior for your goal or guardrails (strictly within your home-gym equipment), auto-resolving 2-stage Setup/Peak photos and instructions via `BasementExercises.resolveExerciseAsync()` and saving them to your catalog.
- **Pre-Circuit Station Swap (`🔄 Swap Exercise`):** Before starting a circuit, lets you swap any exercise for same-muscle alternatives—filtering for missing equipment (e.g., no bands → Dumbbell/Bodyweight only) or easier/joint-friendly variations based on how you feel.
- **7-Day Muscle Blind-Spot Detector (`1. Hub`):** Audits recent movement patterns against your goals to spot neglected muscle groups and stabilizers.
- **Goal Stimulus Calibration, Profile Interview & Live What-If Sim (`2. Profile`):** Calibrates realistic `weeklyTargetSets` and goal-aligned `targetMuscleGroups`, routes voice/text profile updates cleanly into biometrics, goals, `Chronic Guardrails & Joint Rules` (anatomical/injury limits), `Training Preferences & Cadence Rules` (modality preferences like running frequency and consecutive-day spacing rules), or exercise favorites/bans, and runs live what-if circuit simulations (`✨ Live AI Sim`).
- **In-Card Voice Exercise Coach & 2-Stage Photo Synthesis (`3. Catalog` & `1. Hub`):** Answers spoken/text form questions aloud (`gemini-3-flash-preview` + `gemini-2.5-flash-preview-tts`) and generates custom 2-stage Setup/Peak photos (`gemini-3.1-flash-image`).
- **Conversational Pro Trainer Feedback & Data Q&A (`4. Trainer`):** Delivers `COACH'S TAKE` coaching feedback on what is going well, potential fatigue/imbalance risks, and next adjustments—plus answers follow-up questions using your actual logs.

### What Deterministic Code Owns (Safety Rails & Exact Math)
- **Home-Gym Hardware Clamps:** Dumbbells capped `0–50 lb` (or custom lower caps), resistance bands, bench, treadmill, rower (`Resistance 1–30`), and Traditional Sauna.
- **Hard Cadence & Injury Rules:** Enforces spacing rules (such as max 2 consecutive lift days and avoiding back-to-back runs when configured), excludes `⊘` banned lifts, and ignores expired temporary injuries (`expiresAt < todayIso`).
- **Exact Metrics & Correlations:** Calculates Brzycki E1RM ($E1RM = w \times \frac{36}{37 - r}$), 7-day/42-day tonnage and set rollups, and empirical Group A vs. Group B averages across matched log dates.

---

## 2. Anti-Drift Rules for Future Development

1. **Keep AI Dynamic Where Intended:** Never replace AI circuit/weight/rest planning, station swaps, blind-spot detection, or `COACH'S TAKE` coaching feedback with static templates or 3-exercise hardcoded pools.
2. **Keep Safety Rails Intact:** Always clamp AI outputs to home-gym hardware limits and active guardrails with clean offline fallbacks.
3. **Maintain Two-Way Trainer ↔ Hub Directive Parity:** Never let `COACH'S TAKE` in Module 4 prescribe an RPE cap or cardio swap in prose without also updating `basement_trainer_directives` (`targetRpeCap`, `coachTakeSummary`, `recoveryFocus`, `cardioSwapDirective`) and Module 4's `Target RPE` badge, and always feed active `basement_trainer_directives` + `sorenessMap` into Module 1's `sessionEffortGameplan`, station Target RPEs, and `Why This Workout?` rationale.
4. **Keep Docs & Code in Sync:** Update `AI_COACHING_BLUEPRINT.md`, `Basement Lab -Builder Rules.md`, and the QA test script whenever coaching logic changes.

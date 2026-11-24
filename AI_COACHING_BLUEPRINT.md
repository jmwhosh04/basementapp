# Basement Lab · AI Strategy & Coaching Blueprint (`AI_COACHING_BLUEPRINT.md`)

**North Star Objective:** Keep the athlete healthy, consistent, progressing within their home-gym equipment envelope, and injury-free over the long term.

---

## 1. Coaching Philosophy & Two-Layer Architecture

Basement Lab acts as an attentive, longevity-first personal trainer rather than an ego-lifting generator. Every decision is split between **Deterministic Safety & Math Guardrails** (which never hallucinate or break hardware rules) and **Live Gemini AI Synthesis** (which interprets human context, fatigue trends, soreness, and goals).

### Layer A: Deterministic Safety & Math Rails (Code-Owned)
1. **Equipment Ceiling & Hardware Bounds:**
   - Dumbbells strictly clamped `0–50 lb` (or lower user-defined per-exercise caps).
   - Resistance bands (`Yellow`, `Green`, `Blue`, `Black`), adjustable bench, treadmill, rower (`Resistance 1–30`), and Traditional Sauna.
2. **Hard Recovery & Cadence Guardrails:**
   - Respects user-configured spacing rules (e.g., max 2 consecutive lifting days; 48-hour tibial/Achilles clearance between running sessions).
   - Automatically filters out `⊘` Banned exercises and expired temporary injuries (`expiresAt < todayIso`).
3. **Exact Workload & Progression Arithmetic:**
   - **Brzycki E1RM:** $E1RM = w \times \frac{36}{37 - r}$
   - **7-Day Acute vs. 42-Day Chronic Rollups:** Tonnage, working sets, average RPE, run miles, row minutes, and sauna heat minutes.
   - **Empirical A/B Correlations:** Real Group A vs. Group B averages computed across matched log dates.

### Layer B: Live Gemini AI Coaching Brain (AI-Owned)
1. **Daily Circuit, Load & Rest Architect (`basement-hub-circuit.html` — `generateAiCircuitAndBlindSpots`):**
   - Synthesizes the past 7 days of strength logs (including RPE and `durationSec` Time-Under-Tension), recent cardio, active primary/secondary goals, chronic guardrails, 6-zone DOMS soreness, and today's pre-workout check-in note.
   - Sequences 6–7 stations (`✨ AI COACHED`) accounting for intra-workout fatigue (compound movements first, stabilizers/core later) and calibrates per-station weight, reps, tempo, and rest intervals (`25–90s`).
   - **AI New Exercise Introduction (`✨ AI NEW`):** May introduce 1–2 movements outside the base catalog when biomechanically superior for the user's goal/guardrails, auto-resolved via `BasementExercises.resolveExerciseAsync()` for 2-stage Setup/Peak photos and instructions.
2. **Pre-Circuit Pro Trainer Station Swap (`basement-hub-circuit.html` — `requestTrainerSwapAlternatives`):**
   - Before a circuit begins, any station can be swapped (`🔄 Swap Exercise`) for 3 same-muscle alternatives with 1-tap filters for missing equipment (`🚫 Don't Have Equipment — DB / Bodyweight Only`) or lower-fatigue joint-friendly variations (`🌿 Easier / Joint-Friendly Same-Muscle Option`).
3. **7-Day Muscle Blind-Spot Detector (`basement-hub-circuit.html`):**
   - Audits recent logged exercises against active goals to highlight neglected muscle groups and stabilizers (e.g., hip abductors, anterior tibialis, deep rotator cuff, lateral core QL).
4. **Goal Stimulus Calibration & Live What-If Simulator (`basement-coach-profile.html`):**
   - Calibrates realistic `weeklyTargetSets` and goal-aligned `targetMuscleGroups` based on `targetDaysPerWeek` and session window so progress bars measure goal-relevant sets rather than unrelated volume.
   - Routes natural-language profile interview inputs into biometrics, goals, chronic guardrails, or exercise `favorites`/`banned` preferences.
   - Powers `4. AI Sim` (`runLiveAiSimulation`) for testing hypothetical recovery/injury scenarios against real profile rules.
5. **Conversational Pro Trainer Assessment & Data Q&A (`basement-analytics.html`):**
   - `COACH'S TAKE` (`generateProTrainerCoaching`) interprets multi-week trends, RPE drift, check-in notes, and guardrails into actionable coaching advice (never merely reciting raw log counts).
   - Live Follow-Up Q&A answers user questions grounded in `strength_logs`, `cardio_logs`, `sauna_logs`, and `trainer_notes`.
6. **Voice-First In-Card Exercise Coach & 2-Stage Photo Synthesis (`basement-catalog.html` & `basement-hub-circuit.html`):**
   - Spoken biomechanical Q&A (`gemini-3-flash-preview` + `gemini-2.5-flash-preview-tts`) inside every exercise modal, plus 2-stage Setup/Peak photo generation (`gemini-3.1-flash-image`) backed by Supabase Storage.

---

## 2. Closed-Loop Signal Flow

| User Input / Telemetry | Storage Key / Table | How AI & Guardrails Apply It |
| :--- | :--- | :--- |
| Pre-Workout Check-In & 6-Zone DOMS | `trainer_notes` (`pre_workout`), `user_state.coach_context` | Adapts today's Step 0 warm-up, swaps out `Sore ⊘` muscle groups, and logs acute flare-ups. |
| Strength Sets (`weight`, `reps`, `rpe`, `durationSec`) | `strength_logs` | Drives next-session load/rest adjustments, E1RM slope coaching, auto-deloads (`RPE >= 8.9`), and blind-spot detection. |
| Cardio Sessions (`Rowing 1–30`, `Running miles/incline`) | `cardio_logs` | Enforces 48h tibial/Achilles run clearance and balances lower-body fatigue in upcoming circuits. |
| Traditional Sauna Minutes | `sauna_logs` | Tracks heat recovery volume, applies acute-injury/low-sleep sauna cautions, and feeds next-day RPE correlations. |
| Post-Workout Debrief | `trainer_notes` (`post_workout`) | Captures joint feedback (e.g., shoulder popping, heavy legs) to adjust future exercise selection and coaching takeaways. |

---

## 3. Anti-Drift Rules for Future Development

1. **Never Replace Live AI Synthesis with Static Templates:** Keep `generateAiCircuitAndBlindSpots()`, `requestTrainerSwapAlternatives()`, `generateProTrainerCoaching()`, and live data Q&A wired to Gemini with deterministic safety fallbacks—never revert them to hardcoded 3-exercise pools or static stat-recitation strings.
2. **Preserve Safety Clamps:** All AI-generated weights, rest timers, equipment types, and banned-lift exclusions must pass through deterministic validation before rendering.
3. **Keep All Documentation Synchronized:** Any feature change must update `AI_COACHING_BLUEPRINT.md`, `Basement Lab -Builder Rules.md`, and `basement_lab_independent_qa_auditor_test_script_tests_14_01_14_106.md`.

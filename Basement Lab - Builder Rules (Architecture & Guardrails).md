# Basement Lab · Builder Rules (System Architecture, UI Layout & Guardrails)

**Agent Directive:** Read this entire specification before writing, editing, or refactoring any code. Every `localStorage` key, module filename, mobile layout constraint, sub-tab structure, and biomechanical guardrail below is a hard invariant. Never overwrite existing functionality, regress interactive timers/charts, or break cross-module sync to solve a localized prompt.

---

# 1\. System Architecture & Shared Data Bus

Basement Lab is a **mobile-first, 4-module AI personal training and home-gym coaching suite** designed around a single reactive `localStorage` data bus so all standalone modules and the Master Suite Wrapper (`basement-lab-app.html`) stay synchronized in real time via `storage`, `focus`, and `visibilitychange` listeners.

## Standalone Modules & Master Wrapper

| Scope | Module Name | Filename | Required Sub-Tabs / Views |
| :---: | :---- | :---- | :---- |
| **Wrapper** | Master Suite Wrapper (4-Tab Bottom Dock) | `basement-lab-app.html` | Bottom Dock: `🏋️ 1. Hub` \| `🎯 2. Profile` \| `📚 3. Catalog` \| `🧠 4. Trainer` |
| **Module 1** | Daily Hub, Guided Player & Calendar | `basement-hub-circuit.html` | Top 2 Tabs: `1. Today's Circuit` \| `2. Calendar & Logs` (+ Full-Screen `Guided Player` & `🛠️ Manual Build` overlays) |
| **Module 2** | Coach Context & Goals Engine | `basement-coach-profile.html` | Top 4 Tabs: `1. Goals` \| `2. Injuries (N)` \| `3. Life & DOMS` \| `4. AI Sim` |
| **Module 3** | Smart Catalog & Visual Form Coach | `basement-catalog.html` | Search \+ Category Pills \+ Equipment Pills \+ `★ Favs` / `🎯 Goal Lifts` \+ Header `+ AI Add Lift` Modal |
| **Module 4** | AI Pro Trainer & Performance Lab | `basement-analytics.html` | Top 3 Tabs: `1. AI Pro Trainer` \| `2. E1RM & Volume` \| `3. Correlations` |

## Shared Storage Contract (`localStorage` Keys)

- **`basement_coach_context`**: Athlete baseline (`DOB 04/24/1980`, `46 yrs`, `5'11"`, `215 lb`, `BMI 30.0`), Primary Goal (`100%` focus when standalone, or `~70%` focus when paired with an optional Secondary Maintenance Goal at `~30%` focus; includes `durationWeeks`, `currentWeek`, `weeklyTargetSets`, `primaryLifts`, `secondaryLifts`), Mesocycle Phase (`Accumulation`, `Intensification`, `Deload`), 50-lb Dumbbell Cap Progression Mode (`tempo_pause`, `unilateral`, `band_combo`), Exercise Preferences (`★` Favorites & `⊘` Banned), Local Muscle Soreness (`sorenessMap` across 6 zones), Real-Life Physical Loads (`externalLifeLoads`), Expiring Temporary Injuries (`activeTemporaryInjuries`), Chronic Guardrails (`chronicGuardrails`), Daily Biometrics (`sleepHours`, `targetDurationMin`, `targetDurationMax`), Weekly Modality Cadence Rules (`modalityPreferences`), and Dynamically Assembled Step 0 Mobility Primers (`stepZeroPrimers`).  
- **`basement_logs`**: Strength workout logs (`id`, `date`, `exercise`, `weight`, `bandLevel`, `reps`, `rpe`) driving 48-hour anti-overload rotation, Brzycki E1RM curves, and biomechanical imbalance audits.  
- **`basement_cardio_logs`**: Cardio session logs (`id`, `date`, `modality`, `duration`, `distance`, `incline`, `resistance`, `meters`, `rpe`) enforcing shin-splint recovery rules (`Resistance 1–30` for Rowing; `Miles` and `Incline %` for Running).  
- **`basement_sauna_logs`**: Traditional Sauna sessions (`id`, `date`, `duration`, `type`, `timing`) used for post-workout logging, acute-injury/hydration cautions, and next-day readiness correlations.  
- **`basement_custom_catalog`**: Custom exercises, overridden 2-stage human photo slugs (`yuhonas/free-exercise-db`), custom photo URLs, AI-generated 2-stage photos, and custom Quick Cues.  
- **`basement_trainer_directives`**: Closed-loop coaching directives automatically published by Module 4's AI Pro Trainer audit (`calfSets`, `hipStabilitySets`, `tibialisSets`, `sevenDayAvgRpe`, `rpeAdjustment`, `autoInjectLifts`) and mirrored by Module 1's circuit synthesis engine.

---

# 2\. Strict Mobile-First Consumer UI & Zero QA-Leakage Invariants

1. **Mobile Phone Viewport Lock (`max-w-md`):**  
   - Every standalone module and the Master Suite Wrapper **MUST** use a single-column mobile phone container: `class="min-h-screen flex flex-col justify-between max-w-md mx-auto relative bg-slate-950 border-x border-slate-900 shadow-2xl"`  
   - **NEVER** build a wide multi-column desktop bento-grid (`max-w-4xl`, `max-w-5xl`, `max-w-6xl`) or dump all module sections onto one long scrolling page without sub-tabs.  
2. **Zero QA Test IDs or Debug Harness Buttons in Production UI:**  
   - **NEVER** print QA Test IDs or Rule IDs (e.g., `(Test 14.20)`, `(14.47)`, `RULE-02`, `QA (59/59)`) in any visible heading, subtitle, badge, or button.  
   - **NEVER** render developer debug or test-preset buttons (`Test Run Guardrail`, `Test 2-Day Lift Cap`, `Test RPE/TUT Drift`, `Test Empty State`, `Test Slug Self-Heal`, `Publish Directives to Daily Hub`) in the consumer UI.  
   - **NEVER** render raw JSON/code payload boxes (`DIRECTIVE-04: ...`) on the main screen; raw JSON inspection belongs strictly inside a clean modal (`💾 Data` or `JSON`).  
3. **Uncluttered Top Header:**  
   - The top header displays **ONLY** the Module Badge, Today's Date (`YYYY-MM-DD`), Module Title, and the `↻ Sync Context / Readiness %` button (plus `💾 Data` in `basement-lab-app.html`).  
   - Do **NOT** clutter the top header with duplicate age, height, weight, or goal summary strips when Module 1 is open.

---

# 3\. Hard Home-Gym & Biomechanical Guardrails

1. **Equipment Envelope:**  
   - Adjustable dumbbells capped at **50 lb** (`min="0" max="50"`).  
   - Resistance bands (`Yellow (Light)`, `Green (Med)`, `Blue (Heavy)`, `Black (X-Hvy)`).  
   - Adjustable bench, treadmill, rower (`Resistance 1–30`), and Traditional Sauna.  
2. **Modality Cadence Rules:**  
   - **Never Run 2 Days in a Row:** Enforces 48-hour tibial and Achilles impact clearance at `215 lb` body weight (`~538 lb` / `2.5x` landing force). Selecting `Run (30m)` when `ranYesterday === true` displays `🛑 Ran Yest.` on the pill and triggers the `🛑 Shin-Splint Guardrail Violation` banner.  
   - **Never Lift 3 Days in a Row:** Caps consecutive strength days at 2 (`maxConsecutiveLiftDays: 2`).  
     - When `consecutivePriorLiftDays === 1` (`liftedYesterday`), selecting `Lift Circuit` shows the indigo `💪 Pro Trainer Day-2 Split (2nd Consecutive Lift Day Allowed)` banner and rotates 100% away from yesterday's exercises.  
     - When `consecutivePriorLiftDays >= 2`, the AI prescribes a 30-minute Row or Run and shows the rose `🛑 Pro Trainer Rule: You Lifted 2 Days in a Row` banner.  
   - **Target Session Window:** `25–40 minutes` sweet spot.  
3. **50-lb Dumbbell Cap Mastery:**  
   - Automatically prescribes `3s Lower + 2s Pause` (or unilateral upgrades / band combos per Module 2 settings) when lifts reach the `50 lb` ceiling.

---

# 4\. Module 1 UX & Functional Rules (`basement-hub-circuit.html` & Wrapper)

## A. Top Gameplan Card & `🧠 Why This Workout?` Placement

- **Top Bar:** Displays `Today's Gameplan • 25–40 Min Window` on the left, and two action buttons on the right: `🧠 Why This Workout?` and `🛠️ Manual Build`.  
- **`🧠 Why This Workout?` Expansion Position:** Clicking `🧠 Why This Workout?` expands the explanation drawer **immediately below the top action row and directly above** the `🏋️ Lift Circuit | 🏃 Run (30m) | 🚣 Row (30m)` switcher pills.

## B. Post-Workout Completion Lock & Anti-Double-Submit Guard

- **Automatic Lock When Today's Workout Is Saved (`hasCompletedSessionToday`):**  
  - Whenever `basement_logs` or `basement_cardio_logs` contains at least one entry for `todayIso` (e.g., right after finishing a Lift Circuit, Run, or Row and returning to `1. Today's Circuit`), the UI locks everything below the `Lift / Run / Row` switcher pills.  
  - Replaces the active workout/logging forms with the **`🎉 Great Job Today — Go Get Some Rest & Recovery!`** card summarizing today's logged activity (`Strength sets`, `Rowing/Running telemetry`, and `Traditional Sauna minutes`) so the user cannot accidentally hit "Log Row/Run" twice.  
- **Intentional Override (`+ Log Additional Workout`):**  
  - Includes `📅 View in Calendar` and `+ Log Additional Workout` buttons. Clicking `+ Log Additional Workout` sets `allowAdditionalWorkoutToday = true` to reveal the active circuit/cardio forms alongside a `← Back to Today's Saved Summary` link.

## C. 30-Minute Run & Row Card, Auto-Hiding Warm-Up & Telemetry Logger

- **Guided Pre-Row / Pre-Run Warm-Up Box (Auto-Hides When Done or Skipped):**  
  - When `🚣 Row (30m)` or `🏃 Run (30m)` is selected and `!cardioWarmupCompletedToday`, render a clean warm-up launcher box at the top with two buttons:  
    1. `▶ START GUIDED PRE-ROW / PRE-RUN WARM-UP (X DRILLS • ~3 MIN)` (launches `STAGE A` of the Guided Player with 2-stage photos, cues, and live drill timer).  
    2. `Skip Warm-Up →` button right beside/below it.  
  - **No Clutter:** Do NOT render exercise preview pills under the warm-up button, and do NOT render `30 mins • Fits 25–40m Preference` text.  
  - **Auto-Hide Behavior:** As soon as the user completes the guided warm-up drills OR clicks `Skip Warm-Up →`, `cardioWarmupCompletedToday` becomes `true` and **the entire warm-up section disappears**, moving `🚣 Enter Actual Rowing Numbers` / `🏃 Enter Actual Run Numbers` directly to the top of the card.  
- **Cardio Telemetry Inputs & Below-Button Steps 2–4 Plan:**  
  - **Rowing Inputs:** `Actual Time (Min)`, `Resistance (1–30)` (`min="1" max="30"`—never label as "Damper" or "Lvl", and never render Quick-Min or Quick-Lvl pill rows), `Meters (Opt)`, and `Actual RPE` (`6.5`–`9.0`).  
  - **Running Inputs:** `Actual Time (Min)`, `Distance (Miles)`, `Incline %` (shows `⚠️ >1.5% Incline Guard` if `> 1.5`), and `Actual RPE` (`6.5`–`9.0`).  
  - **Pacing Steps 2, 3, and 4 Placement:** Phases **2, 3, and 4** of the 30-minute Rowing/Running pacing plan render **inside the telemetry box directly below** the `✓ LOG 30m ROW / RUN` submit button.

## D. Today's Suggested Circuit, Quick-Add & AI Blind-Spot Discovery

- **Closed-Loop Intelligence Parity:** Module 1 runs the exact same historical RPE and calf-to-hip/tibialis ratio audit as Module 4 (and reads `basement_trainer_directives`), automatically injecting missing stabilizers (`TRAINER AUTO-FIX` / `TRAINER AUTO-ADD`) and displaying the `🔗 Pro Trainer Auto-Adjustment Applied` banner.  
- **Quick-Add Any Catalog Exercise (`+ Add to Today`):** Directly at the bottom of `Today's Suggested Circuit`, provide a dropdown of all catalog exercises \+ `+ Add to Today` button so the user can add 1, 2, or more extra stations to today's circuit in one tap (plus an `×` button on each station to remove one).  
- **AI Blind-Spot Detector Card:** Directly below `Today's Suggested Circuit`, render the `Missing Muscle Groups & Stabilizer Discovery` card with filter pills (`All Blind Spots (5)`, `Hip Abductors (Glute Medius)`, `Anterior Tibialis (Front Shin)`, `Inner-Thigh Adductors`, `Deep Rotator Cuff`, `Lateral Core (QL)`) and `+ Add to Today's Circuit & Save to Catalog` buttons.

## E. Zero-Scroll Guided Workout Player (`Step 0` → `Circuit` → `Session Complete`)

- **Stage A (`Step 0 Warm-Up`):** Shows 2-stage human photos (`1. Setup` \+ `2. Peak`), `⚡ QUICK CUE`, collapsible `Show Full Form & Traps ▼`, and `▶ START MOBILITY DRILL` / `⏹ FINISH DRILL` timer. When launched from Run/Row (`isCardioWarmupMode`), finishing the final drill sets `cardioWarmupCompletedToday = true` and returns directly to the Run/Row telemetry logger.  
- **Stage B (`Main Circuit Player`):**  
  - Displays Round/Station progress, Exercise Title, high-contrast `🎯 TARGET RPE X.X (Leave ~Y Reps in Tank) • 3s Lower + 2s Pause` strip, side-by-side 2-stage photos, untruncated `⚡ QUICK CUE` with `Show Full Form & Traps ▼`, and 50-lb capped load adjuster (`-5`, `-2.5`, `+2.5`, `+5`) or Band color selector.  
  - **Interactive Set Timer:** Clicking `▶ START SET` starts a live `00:01` timer (`guidedState = 'working'`); clicking `⏹ FINISH SET` stops the clock, logs the set to `basement_logs`, and opens the **Active Rest (`00:45`) \+ Completed Reps (`- / +`) \+ Actual RPE (`6.5`–`9.5`)** panel. Also provides `Reset ↺` and `Log Set Without Timer →`.  
- **Stage C (`Session Complete & Post-Workout Traditional Sauna Logger`):**  
  - Displays `10m, 15m, 20m, 25m, 30m` quick-select pills \+ `🔥 Log Xm Traditional Sauna — OK` button (Traditional Sauna only—no temperature or dry/steam inputs), plus `View Calendar & Logs` and `Back to Today Hub`.

---

# 5\. Module 2 UX & Functional Rules (`basement-coach-profile.html`)

- **4 Clean Sub-Tabs:**  
  1. **`1. Goals`**: Primary Goal card (with `Weekly Goal Stimulus Target` progress bar, clickable `Primary Drivers` & `Secondary/Recovery` 2-stage photo buttons, and collapsible `Change 1° Goal ▼` drawer with presets \+ `✨ AI Build & Set Goal`), `Block Phase & Deload Control` (`Wk 1-3: Base`, `Wk 4-7: Push`, `Deload Week`), `Secondary / Maintenance Goal (~30% Focus)`, `50-lb Dumbbell Cap Progression Mode`, and `Personal Exercise Preferences` (`★` & `⊘` pill chips).  
  2. **`2. Injuries (N)`**: Expiring Temporary Injuries logger with region, severity, `+7d / +14d / +30d` expiration buttons, active countdown, and `AI Impact` explanation.  
  3. **`3. Life & DOMS`**: Athlete Baseline Anthropometrics (`04/24/1980`, `46 yrs`, `5'11"`, `215 lb`, `Edit` toggle), 6-zone interactive `Local Muscle Soreness (DOMS) Map`, `Non-Gym "Real Life" Physical Load` toggles, `Chronic Guardrails` with Web Speech API voice dictation (`🎤`) & AI Summarizer, `Daily Biometric & Schedule Inputs`, `Pro Trainer Weekly Modality Cadence`, and `Dynamically Assembled Step 0 Primer` reactive preview.  
  4. **`4. AI Sim`**: Holistic AI Conflict & Anti-Overload Simulator testing Scenarios A, B, and C with synthesized 6-station circuit output \+ `✨ Live AI Brief`.

---

# 6\. Module 3 UX & Functional Rules (`basement-catalog.html`)

- **Side-by-Side 2-Stage Human Photos Everywhere:**  
  - Every exercise card in the catalog list **MUST** display Stage 1 (`0.jpg`) and Stage 2 (`1.jpg`) side-by-side (`w-28` thumbnail pair) on the left of a compact horizontal card—never a single-stage vertical card or global Stage 1/Stage 2 toggle button.  
- **Header `+ AI Add Lift` Modal:**  
  - Adding a custom exercise is triggered via the `+ AI Add Lift` button in the top-right header (or via the empty-search fallback button), opening a clean modal rather than rendering a large permanent form on the main page.  
- **Universal Form Coach Modal & 873-Exercise Photo Picker:**  
  - Clicking any exercise opens the Form Coach modal with `🖼️ Search 870+ DB or AI Generate ▼` (live search of all 873 `yuhonas/free-exercise-db` human photo pairs \+ `✨ AI Generate Exact Photo` \+ direct URL inputs) and inline editable `⚡ Quick Cue`.

---

# 7\. Module 4 UX & Functional Rules (`basement-analytics.html`)

- **3 Clean Sub-Tabs (`1. AI Pro Trainer` \| `2. E1RM & Volume` \| `3. Correlations`):**  
  1. **Tab 1 — `1. AI Pro Trainer`:**  
     - **Card 1: Multi-Horizon Conversational Pro Trainer Clipboard (`Past 7 Days (RPE)` \| `6–8 Week Trends` \| `3-Month Macro`):** Evaluates whether 7-day RPE is too light (`<7.4`), in the hypertrophy sweet spot (`7.4–8.8`), or redlining (`>=8.9`), audits the exact logged ratio of **Calf Sets vs. Hip-Stability Sets vs. Anterior Tibialis Sets**, and shows the `🔗 Auto-Synced to Module 1 Circuit Engine` status strip.  
     - **Integrated Follow-Up Q\&A Bar Directly Below Summary:** Right inside the bottom of the Clipboard card sits `💬 Ask Follow-Up Questions About Your Data` with voice mic (`🎤`) and text input (with **zero pre-seeded question button clutter**). Every answer cites real logged numbers (`📊 Data Checked`) and auto-syncs directives to `basement_trainer_directives`.  
     - **Card 2: Goal Block Roadmap (`Where Am I & What's Next?`):** Tracks the 3-stage block timeline (`1. Wk 1–3: Base Accumulation` → `2. Wk 4–7: Push & Stabilizers` → `3. Wk 8+: Peak & Graduate`), `- / +` week stepper, and 3 readiness pillars (`Weekly Volume`, `1° Lift Strength`, `Armor Balance`). Explains when to step into the Wk 4–7 Push Phase, schedule a 1-Week Deload, or **Graduate the current Primary Goal to `~30% Secondary Maintenance` (`3–4 sets/wk`)** while promoting the next Primary Goal block in 1 tap.  
  2. **Tab 2 — `2. E1RM & Volume`:**  
     - Renders `7-Day Acute vs. 6-Week Chronic Workload` cards, `1° Goal Weekly Sets` progress bar, `Pro Trainer Cadence & Shin-Safety Audit` (`✓ 0 Back-to-Back Runs`), `6-Week Muscle Category Balance` bars, and the **Interactive SVG Brzycki E1RM Progression Line Chart** ($E1RM=w\times \frac{36}{37-r}$) with exercise selector dropdown, Peak vs. Latest E1RM cards, session breakdown list, and `⚡ 50-lb Dumbbell Cap Progression Coach`.  
  3. **Tab 3 — `3. Correlations`:**  
     - **Dynamic 8-Hypothesis A/B Pattern Scanner:** Scans 8 paired date hypotheses across actual logs (`Prior-Day Sauna`, `Running Within 24h of Lower Body`, `48h vs. 24h Lift Spacing`, `Prior-Day Row vs. Prior-Day Run`, `Session Volume Density`, `Weekend vs. Workweek Lifting`, `Lower-Body vs. Upper-Body RPE`, `Rowing Resistance Efficiency`), scores and ranks them dynamically by `effectScore`, surfaces the **Top 2 strongest signals** in a conversational summary banner at the top (`Hey — We Noticed These Top 2 Correlations in Your Data`), and renders side-by-side Group A vs. Group B comparison bars with matched log dates (`📅 Matched Log Dates`) and a `Show All 8 Scanned ▼` toggle.

# **6\. Module 3 & Universal Exercise Form Card Modal Rules (3\. Catalog & All Modules)**

* **Quick Cue Always Visible on Compact Cards:** Every exercise card on Today's Suggested Circuit and 3\. Catalog displays side-by-side 2-stage human photos (0.jpg \+ 1.jpg) on the left and the **⚡ Quick Cue visible right on the card** without opening the modal.  
* **Strict Layout Order Inside the Opened Exercise Form Card Modal:**  
  1. **Top Header:** Equipment/Category badge, Exercise Title, and Close (×) button.  
  2. **2-Stage Human Photos \+ Photo Fixer Toggle:** Side-by-side 1\. Setup / Start and 2\. Peak / End photos with 1-line setup/peak captions \+ 🖼️ Change 2-Stage Photo ▼ (873-exercise search \+ AI generator).  
  3. **🗣️ Voice AI Exercise Coach (Directly Below Photos):** Lets the user tap 🎤 Speak (or type) to ask any question about that specific exercise (e.g., symptoms of going too heavy, joint mechanics, form adjustments) and hear the answer spoken aloud via Gemini TTS (Zephyr).  
  4. **Full Long-Form Explanation (Below the Voice AI Coach):**  
     * **⚡ Quick Cue (Remember on Every Rep)**  
     * **🎯 Target Muscles Worked**  
     * **✅ How to Set Up & Perform (4-Step Good Form)**  
     * **⚠️ What to Watch Out For (Form Breakdown Traps)**  
     * **🧬 Basement Lab Joint & Hypertrophy Science** \=======

# **7\. Guided Workout Player, Manual Build & Calendar Rules (1\. Hub)**

* **Zero-Friction Guided Workout Player (Step 0 Warm-Up** $\rightarrow$ **Rounds 1–3** $\rightarrow$ **Session Complete):**  
  * **Above-the-Fold Mobile Layout:** Shows Round/Station header, Exercise Title, high-contrast 🎯 TARGET RPE X.X strip, side-by-side 2-stage human photos (h-24), full-width ⚡ QUICK CUE with collapsible Show Full Form & Traps ▼, 1-row Planned Load adjuster (\-5, \-2.5, \+2.5, \+5 capped at 50 lb or Yellow / Green / Blue / Black Band selector), and giant thumb-friendly **▶ START SET** / **⏹ FINISH SET (00:00)** button (plus Reset ↺ and Log Set Without Timer →).  
  * **Active Rest Countdown (00:45):** After finishing a set, starts a 00:45 rest countdown while letting the user adjust Completed Reps (- / \+) and rate actual post-set RPE (6.5, 7.0, 7.5, 8.0, 8.5, 9.5).  
  * **Post-Workout Session Complete (STAGE C):** Includes the optional **Traditional Sauna** logger (10m, 15m, 20m, 25m, 30m \+ 🔥 Log Xm Traditional Sauna — OK) and conditional 🛑 Skip Sauna Today / ⚠️ Sauna Caution Today banner when acute injury (\<=3d) or low sleep (\<6.0h) is active.  
* **Full-Screen Manual Circuit Builder (🛠️ Manual Build) & AI Blind-Spot Discovery:**  
  * 🛠️ Manual Build opens a full-screen custom builder overlay (currentView \= 'manual\_build', never a 3rd top tab) with ↑ / ↓ station reordering, real-time negative-load conflict warnings, 1-tap safe swaps (\+ Use \[Alternative\] Instead), and ▶ START CUSTOM CIRCUIT.  
  * The **AI Blind-Spot Detector** card surfaces 5 stabilizer blind spots (Hip Abductors, Anterior Tibialis, Inner-Thigh Adductors, Rotator Cuff, Lateral Core) with 1-tap \+ Add to Today's Circuit & Save to Catalog.  
* **Monthly Consistency Calendar & Retroactive Loggers (2\. Calendar & Logs):**  
  * Displays monthly calendar grid with color-coded activity dots (Strength, Cardio, 🔥 Sauna), month navigation (← / →), and retroactive \+ Log Strength, \+ Log Cardio (Rowing Resistance 1–30 vs. Run Miles/Incline), and 🔥 \+ Log Sauna drawers, plus × delete buttons on logged items.

# **8\. Module 4 Rules (4\. Trainer — AI Pro Trainer, E1RM Graph & Correlations)**

* **Sub-Tab 1\. AI Pro Trainer:**  
  * **Multi-Horizon Pro Trainer Clipboard (Past 7 Days (RPE) \| 6–8 Week Trends \| 3-Month Macro):**  
    * Evaluates rolling 7-day RPE (\<7.4 under-stimulating $\rightarrow$ auto-bumps target to RPE 8.5; 7.4–8.8 sweet spot; \>=8.9 redline $\rightarrow$ auto-caps target at RPE 7.5) and audits the **Calf Sets vs. Hip-Stability Sets vs. Anterior Tibialis Sets** ratio.  
    * Automatically syncs basement\_trainer\_directives to Module 1 (TRAINER AUTO-FIX / TRAINER AUTO-ADD) with **zero** manual "Publish Directives" debug buttons.  
  * **Integrated Voice & Text Follow-Up Q\&A (💬 Ask Follow-Up Questions About Your Data):**  
    * Sits directly inside the Clipboard card below the summary with 🎤 voice mic, text input, and 🔊 spoken Gemini TTS replies.  
  * **Recent Voice Check-Ins & Post-Workout Debrief Log (basement\_trainer\_notes):**  
    * Displays the athlete's recent PRE-WORKOUT and POST-WORKOUT voice/text notes alongside the trainer's adaptation feedback so the Pro Trainer tracks ongoing joint feedback (e.g., shoulder popping on overhead raises or dead legs on runs) over time.  
  * **Goal Block Roadmap & Maintenance Graduation Advisor:**  
    * Tracks Wk X/Y timeline progress (\-/+ week stepper), 3 readiness pillars (Weekly Volume, 1° Lift Strength, Armor Balance), and 1-tap buttons to advance phases (Wk 4–7 Push / Deload) or **graduate the current Primary Goal into the \~30% Secondary Maintenance slot** and promote the next Primary Goal block.  
* **Sub-Tab 2\. E1RM & Volume:**  
  * Displays **7-Day Acute vs. 6-Week Chronic** workload rollup cards (Tonnage, Sets, Avg RPE, Run Miles, Row Mins, 🔥 Sauna Mins), 1° Goal Weekly Sets progress bar, **Modality Cadence Audit** (✓ 0 Back-to-Back Runs), and an **interactive \<svg\> Brzycki E1RM Progression Line Chart** ($E1RM=w\times \frac{36}{37-r}$) with exercise selector dropdown and 50-lb Dumbbell Cap Progression Coach.  
* **Sub-Tab 3\. Correlations:**  
  * Runs the **Dynamic 8-Hypothesis A/B Correlation Scanner** across logged dates (Prior-Day Sauna, Running Within 24h, 48h vs. 24h Lift Spacing, Prior-Day Row vs. Run, Session Density, Weekend vs. Workweek, Lower vs. Upper RPE, Row Resistance), surfaces a **Top-2 Conversational Takeaways Banner** at the top, and renders side-by-side **Group A vs. Group B** empirical comparison bars with matched log dates (📅 Matched Log Dates).


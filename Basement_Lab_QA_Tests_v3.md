# Basement Lab · Independent QA Auditor Addendum (Test 14.121)

### Test 14.121: Daily Hub Pre-Workout DOMS Selector & Conditional Lower-Leg Armor Ratio
- **Pre-Workout DOMS on Hub:** Verify that the 6-zone `Local Muscle Soreness` selector renders on `1. Hub` prior to generating today's circuit (`Fresh ✓` / `Tight` / `Sore ⊘`), updates `basement_coach_context.sorenessMap`, and no longer duplicates inside `2. Profile → 3. Life & DOMS`.
- **Conditional Lower-Leg Armor Metrics:** Verify that `Calf Sets`, `Hip Stab.`, and `Tibialis` cards in `4. Trainer` (and lower-leg stabilizer auto-injections in `1. Hub`) render ONLY when the user has an active calf/shin/Achilles/plantar/ankle guardrail, injury, or running-armor goal, and fall back to `Upper Sets / Lower Sets / Core Sets` when no lower-leg guardrails exist.
- **Clean Multi-User Defaults:** Verify that opening `1. Hub` on a fresh user profile starts with empty logs, empty guardrails, and empty soreness map rather than pre-seeded personal stats.

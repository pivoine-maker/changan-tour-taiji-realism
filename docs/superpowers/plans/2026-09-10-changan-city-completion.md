# Whole City Implementation Plan

Apply subagent-driven-development and dispatching-parallel-agents with explicit ownership; root integrates/reviews. No commits per user instructions.

- [x] Layout/navigation worker: shared canonical reserved regions/wall openings; narrow ward spacing; collision-aware route API and objective reachability tests. Own data/changanCity.ts, new data/cityLayout.ts, movementObstacles.ts and navigation modules/tests; world.ts only if essential. Never edit renderer/UI.
- [x] Architecture worker: FullCityAssets.ts / OrdinaryWardAssets.ts and new CityArchitecture geometry/tests. Consume shared layout; optional realistic mode, coherent roof replacement, gates, cheap vegetation, budget proof. Never edit navigation/data shared files.
- [x] UI worker: new cityDestinations.ts and cityTourUi.ts/tests, appUi.ts region labels/tests. Independent compact selector, camera callback contract. Root integrates main/styles to avoid conflicts.
- [x] Root: whole-city material application and reversible integration; generic camera destination/startup overview; route API wiring; local shadow coverage and guarded path behavior.
- [x] Root/review: verify coverage/routes/budgets/fulltests/build and multi-district screenshots, controls/save. Fix found issues without asking to continue. Snapshot completed release/report.

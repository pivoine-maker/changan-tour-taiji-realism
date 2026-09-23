# Crown Volume Implementation Plan

> Use subagent-driven-development for the independent point generator, root owns integration and browser validation. User authorizes continuous execution, forbids commits.

**Goal:** Coherent 3D crown masses at existing tree locations within a smaller geometry budget.
**Architecture:** Fit deterministic source clusters once, generate6000 fill positions; retain source fringe quarter-sample; same leaf geometries and existing LOD. No building/layout changes.
**Tech Stack:** Three.js, TypeScript, Vitest, Playwright.

- [x] `TaijiCrownVolume.ts/test`: generateCrownVolume(leaves) returns6000 readonly source positions. K-means9centers,10iterations on every4 source points, deterministic farthest-center initialization; ellipsoid radii from axis variance, clamp source bounds; Halton/hash points uniform within each ellipsoid, cluster population proportion. Test determinism/bounds/sourceunchanged/count.
- [x] Integrate TaijiTrees.ts only: 16000 authored near leaves plus6000 fine fill,2000 authored far plus3000 fill; transform source positions through existing frame and baseY. Deterministic varied normals and leaf length .30–.44m, width ratio .45–.68. Final near/far counts22000/5000; fill base scale .55 shared; existing far area compensation applies both. Same leaf map/material/disposal/LOD.
- [x] Run helper/tree tests and tsc; capture baseline/candidate main, rotated, overview and foliage close. Quantify vertices. Independent visual review.
- [x] If gain visible, test actual path128 and interaction, remove diagnostics, fullsuite/build/preserve29. Otherwise archive andrestore28. Report source task outcome.

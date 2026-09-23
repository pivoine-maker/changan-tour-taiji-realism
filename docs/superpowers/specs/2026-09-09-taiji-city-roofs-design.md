# XVIII reversible city roof prototype

Replace the four full-city-building-roof-* BoxGeometry references with one owned closed hip roof only while pilot is enabled. Preserve all654 instance transforms, materials, shadow flags and counts. Unit XZ bounds±.5 and eaveY−.5 preserve the original footprint and eave elevation. RidgeY2.0 with X ridge endpoints±.16 produces a 1.95m rise after the existing .78 Y scale; the former exact-envelope .78m rise was visually indistinguishable from flat background boxes. Four hard-normal roof slopes and closed bottom,8triangles. The four long-depth outer gatehouse roofs are a known simplified proportion in this first candidate; assess visually.

Restore exact original geometry references on disable/dispose, dispose only owned geometry. Recompute instance mesh bounds if required after swap; no original assets disposed. Test winding, footprint, reversible lifecycle and original matrices. Compare matching palace overview, reject if ineffective or faulty.

## Outcome: rejected
Actual screenshots reveal no useful improvement; OrdinaryWardAssets already overlays larger gable roof slopes on these same buildings. Runtime reverted to XVII. Candidate source/evidence preserved in output report.

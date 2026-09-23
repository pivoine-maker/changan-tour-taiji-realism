# XIII canopy reconstruction

After rejecting the dark PBR stone candidate, focus on the largest whole-scene gap: sparse foliage compared with the approved reference. Existing branch-aligned leaf placement uses an arbitrary uniform size range and ignores source PCA leaf dimensions. Preserve each source leaf's length/width distribution and tree transform, with square-root area compensation for retained samples and sensible caps for outliers. This should recover canopy density without more leaf triangles.

First evaluate the existing 14 trees at the same tree and whole-scene cameras, preserving material/light/roof/layout. Only retain a visibly more coherent canopy; avoid giant leaves or dense geometric blobs. Further garden replacement can be considered after the existing canopy and performance are checked.

## Garden extension
The existing canopy candidate was visibly denser without added leaf triangles. Extend the same asset to ten existing inner-garden planting zones, shifting trunks away from pavilion footprints and leaving the pond and central passage clear. Hide original low-detail garden trees only once the replacement loads successfully. Building/pond geometry and movement obstacles remain unchanged.

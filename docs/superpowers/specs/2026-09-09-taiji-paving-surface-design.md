# XVIII actual courtyard stone surface prototype

Use officially sourced CC0 Stone Tile Wall by Charlotte Baglioni only for courtyard slab surfaces. Source describes mixed stone, not verified limestone or scan. Preserve raw color/OpenGL normal/roughness maps with provenance. The source contains baked joints, so use a matching interior UV rectangle in all maps, via geometry UV mapping, not image modification. Existing physical slab joints remain the only visible joints.

Create a separate paving material and fallback to current stone if optional maps fail. Color sRGB, normal/roughness linear, roughness1 and restrained normalScale initially. Keep existing slab transforms/colors, all architecture stone, lights/exposure, footprints and interactions. Compare close and overview; revert if darker/browner/wetter or ineffective.

Optional load must dispose partial results, all accepted textures/materials have existing scene ownership. Source patch bounds to be selected from inspected diffuse.

## Outcome: rejected
Actual same-view comparison is slightly darker and less speckled but provides no convincing depth/wear or overview gain. Restored XVII runtime, preserved source assets and candidate code/screenshots in rejection report.

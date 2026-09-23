# Far canopy area preservation candidate

The authored leaf primitive contains 30,250 connected components. The deterministic 16,000-component sample retains 52.915% of source triangle area, matching its 52.893% component retention, and the near LOD compensates for that sampling density. The former half-count compact far LOD at scale 1.35 retained 76.5% of near XZ blade planform (and about 71% by folded triangle surface) at overview distance.

The far scale is now derived from the indexed XZ planform areas of the near and compact leaf geometries and their unchanged two-to-one instance stride. This preserves aggregate planform without adding instances or vertices. Near leaf frames, source positions, tree scale, materials, and LOD distance remain unchanged. The source model is still a compact young tree; this correction does not attempt to turn it into the mature, dense species shown in the visual reference.

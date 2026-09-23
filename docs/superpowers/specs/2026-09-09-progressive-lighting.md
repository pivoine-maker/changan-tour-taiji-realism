# Progressive lighting experiment

The user has authorized autonomous continuation, preserving the original project, backups, and interaction. No further approval or commits are requested. Version VI is preserved and remains the fallback.

Use Three 0.179 with three-gpu-pathtracer 0.0.23 in an optional local experiment. Geometry remains real and camera-dependent. The raster scene must remain usable while preparing the BVH, moving the camera, or walking. After at least 500ms without camera or actor movement, accumulate genuine path-tracing samples with three light bounces. No depth-of-field blur or generated scene background is allowed.

Rejected alternatives: replacing the scene with the approved image destroys interaction; continuously path tracing every movement increases latency and noise; another exposure-only iteration cannot supply indirect light.

The adapter expands visible instanced geometry and deinterleaves attributes into owned geometry, preserving source meshes, instance colors, indices, and world transforms. Reject more than eight million expanded vertices before allocation. Standard meshes keep source geometry ownership separate. Background city geometry remains included; do not crop away distracting buildings to claim realism.

Build the BVH asynchronously. Keep the raw HDR environment for the path tracer and use the existing PMREM for raster rendering. Camera updates reset samples. Actor movement returns immediately to raster and refreshes its copied transforms before rebuilding the idle result. An initialization or rendering failure disables the experiment and retains the raster mode.

Accept only if actual browser comparison shows useful light transport, controls remain responsive, and memory/build latency is bounded. Otherwise record the measured failure and restore version VI's default renderer. This is an experiment, not a declaration of photorealism.

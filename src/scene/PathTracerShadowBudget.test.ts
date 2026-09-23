import pathShader from '../../node_modules/three-gpu-pathtracer/src/materials/pathtracing/PhysicalPathTracingMaterial.js?raw';
import visibilityShader from '../../node_modules/three-gpu-pathtracer/src/materials/pathtracing/glsl/attenuate_hit_function.glsl.js?raw';

const paths = [
  'node_modules/three-gpu-pathtracer/src/materials/pathtracing/PhysicalPathTracingMaterial.js',
  'node_modules/three-gpu-pathtracer/src/materials/pathtracing/glsl/attenuate_hit_function.glsl.js',
];

// Execute the installed shader's actual skip branch with synthetic intersections.
// The surrounding harness only supplies ray/state values and a three-bounce loop.
function traceSkippedSurfaces(path: string, hits: Array<'skip' | 'surface' | 'escape'>) {
  const source = path === paths[0] ? pathShader : visibilityShader;
  const start = source.indexOf('if ( ! material.castShadow &&');
  const open = source.indexOf('{', start);
  let end = open + 1, nesting = 1;
  while (nesting) {
    if (source[end] === '{') nesting++;
    if (source[end] === '}') nesting--;
    end++;
  }
  const branch = source.slice(open + 1, end - 1);
  const declaration = source.match(/int nonShadowTraversals = \d+;/)?.[0].replace('int ', 'let ') ?? '';
  const run = new Function('hits', `
    ${declaration}
    const state = { depth: 0 };
    const ray = { origin: 0, direction: 1 };
    const surfaceHit = { faceNormal: 1, dist: 1 };
    const stepRayOrigin = () => 0;
    let visited = 0, surfaces = 0, escaped = false;
    for (let i = 0; i < 3; i++) {
      state.depth++;
      if (++visited > 1000) throw new Error('Unbounded skipped-surface traversal');
      const hit = hits[visited - 1] ?? 'escape';
      if (hit === 'escape') { escaped = true; break; }
      if (hit === 'skip') { ${branch} }
      surfaces++;
    }
    return { visited, surfaces, escaped };
  `);
  return run(hits) as { visited: number; surfaces: number; escaped: boolean };
}

it.each(paths)('lets environment rays pass three non-shadow surfaces in %s', path => {
  expect(traceSkippedSurfaces(path, ['skip', 'skip', 'skip', 'escape'])).toEqual({
    visited: 4, surfaces: 0, escaped: true,
  });
});

it.each(paths)('preserves three real surface bounces after skips in %s', path => {
  expect(traceSkippedSurfaces(path, ['skip', 'skip', 'surface', 'surface', 'surface', 'escape'])).toEqual({
    visited: 5, surfaces: 3, escaped: false,
  });
});

it.each(paths)('terminates a pathological stack without treating it as clear in %s', path => {
  const result = traceSkippedSurfaces(path, Array(10_000).fill('skip'));
  expect(result.escaped).toBe(false);
  expect(result.surfaces).toBe(0);
  expect(result.visited).toBeLessThanOrEqual(65);
  expect(result.visited).toBeGreaterThan(3);
});

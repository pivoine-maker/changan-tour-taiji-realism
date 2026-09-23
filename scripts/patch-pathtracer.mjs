import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../node_modules/three-gpu-pathtracer/src/uniforms/RenderTarget2DArray.js',import.meta.url);
const version=JSON.parse(readFileSync(new URL('../node_modules/three-gpu-pathtracer/package.json',import.meta.url),'utf8')).version;
if(version!=='0.0.23')throw new Error('Review path tracer compatibility patches before changing dependency version');
let source=readFileSync(file,'utf8');
if(!source.includes('disposeRenderTarget')){
  const needle='this.fsQuad = fsQuad;';
  if(!source.includes(needle))throw new Error('Path tracer cleanup patch source changed');
  source=source.replace(needle,needle+'\n\t\tthis.texture.disposeRenderTarget = () => { fsQuad.material.dispose(); this.dispose(); };');
  writeFileSync(file,source);
}

// 0.0.23 charges non-shadow surface skips to the real bounce budget. Its
// visibility loop then reports exhausted traversal as occlusion. Keep a separate
// finite allowance: at most 64 extra intersections per path / visibility query.
// Exhaustion still terminates conservatively; no unbounded shader loops.
function patchShadowSkips(relativePath, loopBound, adjustDepth) {
  const target=new URL('../node_modules/three-gpu-pathtracer/src/'+relativePath,import.meta.url);
  let shader=readFileSync(target,'utf8');
  const marker='// Taiji bounded non-shadow traversal allowance';
  if(shader.includes(marker))return;
  const loop=`for ( int i = 0; i < ${loopBound}; i ++ ) {`;
  const skip=/if \( ! material\.castShadow && (?:state\.)?isShadowRay \) \{([\s\S]*?)continue;\s*\}/g;
  if(!shader.includes(loop)||[...shader.matchAll(skip)].length!==1)throw new Error('Path tracer shadow traversal patch source changed: '+relativePath);
  shader=shader.replace(loop,`${marker}\n\t\tint nonShadowTraversals = 64;\n\t\t${loop}`);
  shader=shader.replace(skip,(matched,body)=>matched.replace(body,`
      if ( nonShadowTraversals == 0 ) { break; }
      nonShadowTraversals --;
      i --;
      ${adjustDepth?'state.depth --;':''}
      ${body}`));
  writeFileSync(target,shader);
}

patchShadowSkips('materials/pathtracing/PhysicalPathTracingMaterial.js','bounces',true);
patchShadowSkips('materials/pathtracing/glsl/attenuate_hit_function.glsl.js','traversals',false);

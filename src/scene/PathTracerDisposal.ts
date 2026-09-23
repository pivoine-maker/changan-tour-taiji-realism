/** Compatibility cleanup for the pinned three-gpu-pathtracer 0.0.23.
 * Its public dispose uses `_renderQuad`, but the constructor creates `_quad`.
 * Keep this isolated until the dependency is upgraded and verified with Three 0.179.
 */
type Disposable={dispose():void};
type InternalMaterial=Disposable&{uniforms?:Record<string,{value:unknown}>};
type InternalTracer=Disposable&{material:InternalMaterial;_blendQuad?:{material:Disposable}};
interface Internals {
  _quad:Disposable&{material:Disposable};
  _pathTracer:InternalTracer;
  _lowResPathTracer:InternalTracer;
  _generator:{geometry:Disposable};
  _internalBackground?:Disposable;
  _colorBackground?:Disposable;
}
export function disposePathTracer023(tracer:unknown):void {
  const t=tracer as Internals;
  const seen=new Set<unknown>();
  const release=(value:unknown)=>{
    if(value&&typeof (value as Disposable).dispose==='function'&&!seen.has(value)){
      seen.add(value);(value as Disposable).dispose();
    }
  };
  for(const renderer of [t._pathTracer,t._lowResPathTracer]){
    const uniforms=renderer.material.uniforms??{};
    for(const name of ['textures','iesProfiles']){
      const owned=uniforms[name]?.value as {disposeRenderTarget?:()=>void}|undefined;
      if(owned?.disposeRenderTarget&&!seen.has(owned)){seen.add(owned);owned.disposeRenderTarget();}
    }
    release((uniforms.lights?.value as {tex?:unknown}|undefined)?.tex);
    // These uniforms are allocated/owned by the path tracer; backgroundMap can be external.
    for(const name of ['bvh','attributesArray','materialIndexAttribute','materials','textures','iesProfiles','envMapInfo','stratifiedTexture','stratifiedOffsetTexture'])release(uniforms[name]?.value);
    release(renderer.material);release(renderer._blendQuad?.material);release(renderer);
  }
  release(t._quad.material);release(t._quad);release(t._generator.geometry);
  release(t._internalBackground);release(t._colorBackground);
}

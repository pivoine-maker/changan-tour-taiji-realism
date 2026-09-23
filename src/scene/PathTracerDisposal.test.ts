import {describe,it,expect,vi} from 'vitest';
// @ts-expect-error This pinned package declares only its public entry; Vite uses its ESM source.
import {PhysicalPathTracingMaterial} from 'three-gpu-pathtracer/src/index.js';
import {disposePathTracer023} from './PathTracerDisposal';
describe('0.0.23 compatibility cleanup',()=>{
  it('installed pinned dependency exposes target cleanup for both texture arrays',()=>{
    const material=new PhysicalPathTracingMaterial();
    for(const key of ['textures','iesProfiles']){
      const texture=material.uniforms[key].value as {disposeRenderTarget?:()=>void};
      expect(texture.disposeRenderTarget).toBeTypeOf('function');
      texture.disposeRenderTarget!();
    }
    material.dispose();
  });
  it('cleans the actual _quad and shared owned material once without disposing external background',()=>{
    const resource=()=>({dispose:vi.fn()});
    const background=resource(),owned=resource();
    const material={...resource(),uniforms:{textures:{value:owned},backgroundMap:{value:background}}};
    const quad={...resource(),material:resource()};
    const tracer={_quad:quad,_pathTracer:{...resource(),material},_lowResPathTracer:{...resource(),material},_generator:{geometry:resource()}};
    expect(()=>disposePathTracer023(tracer)).not.toThrow();
    expect(quad.dispose).toHaveBeenCalledOnce();expect(material.dispose).toHaveBeenCalledOnce();
    expect(owned.dispose).toHaveBeenCalledOnce();expect(background.dispose).not.toHaveBeenCalled();
  });
});

import * as THREE from 'three';
import {ShadowRefresh} from './ShadowRefresh';
it('reuses static shadows during camera movement, refreshes after settling and follows actor motion',()=>{
 const cache=new ShadowRefresh(),camera=new THREE.Matrix4(),actor=new THREE.Matrix4();
 expect(cache.update(camera,actor,0)).toBe(true);
 expect(cache.update(camera,actor,200)).toBe(true);
 expect(cache.update(camera,actor,201)).toBe(false);
 camera.makeTranslation(1,2,3);expect(cache.update(camera,actor,210)).toBe(false);
 expect(cache.update(camera,actor,300)).toBe(false);expect(cache.update(camera,actor,361)).toBe(true);
 actor.makeTranslation(1,0,0);expect(cache.update(camera,actor,362)).toBe(true);
 expect(cache.update(camera,actor,363)).toBe(false);
});

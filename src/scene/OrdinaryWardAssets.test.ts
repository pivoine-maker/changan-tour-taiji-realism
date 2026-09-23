import * as THREE from 'three';
import { changanCity } from '../data/changanCity';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';
import { createOrdinaryWardDetails, isOrdinaryWardDetailTarget } from './OrdinaryWardAssets';

it('keeps retained life props in both modes off buildings, eaves, walls and the central cross lane',()=>{
  const wards=changanCity.wards.filter(isOrdinaryWardDetailTarget);
  for(const realistic of [false,true])for(const ward of wards){
    const details=createOrdinaryWardDetails(createHistoricalMaterialLibrary(),{...changanCity,wards:[ward],gatehouses:[]},{realistic});
    const centerX=(ward.bounds.minX+ward.bounds.maxX)/2,centerZ=(ward.bounds.minZ+ward.bounds.maxZ)/2;
    details.traverse(object=>{
      if(!(object instanceof THREE.InstancedMesh)||!/^ordinary-ward-(well|stall|cart|resident|cargo|pottery|banner|shrub|drain|hitching)/.test(object.name))return;
      object.geometry.computeBoundingBox();
      for(let i=0;i<object.count;i++){
        const matrix=new THREE.Matrix4();object.getMatrixAt(i,matrix);
        const actual=object.geometry.boundingBox!.clone().applyMatrix4(matrix);
        // Classic ridge-end pottery is architectural roof decoration, not a life prop.
        if(!realistic && object.name==='ordinary-ward-pottery-jars' && actual.min.y>3)return;
        expect(actual.max.x<=centerX-3||actual.min.x>=centerX+3).toBe(true);
        expect(actual.max.z<=centerZ-3||actual.min.z>=centerZ+3).toBe(true);
        for(const building of ward.buildings){
          const envelope=new THREE.Box3(new THREE.Vector3(-(building.width+1.1)/2,-1,-(building.depth+1.1)/2),new THREE.Vector3((building.width+1.1)/2,100,(building.depth+1.1)/2));
          envelope.applyMatrix4(new THREE.Matrix4().makeTranslation(building.x,0,building.z).multiply(new THREE.Matrix4().makeRotationY(building.rotation??0)));
          expect(actual.intersectsBox(envelope)).toBe(false);
        }
      }
    });
  }
});

it('retains paired residents and complete court assemblies without exceeding old prop counts',()=>{
  const materials=createHistoricalMaterialLibrary();
  const root=createOrdinaryWardDetails(materials,changanCity,{realistic:true});
  const count=(name:string)=>(root.getObjectByName('ordinary-ward-'+name) as THREE.InstancedMesh|undefined)?.count??0;
  const people=count('resident-bodies');
  expect(people).toBeGreaterThan(100);expect(people).toBe(count('resident-heads'));expect(people).toBeLessThanOrEqual(changanCity.wards.length*3);
  expect(count('well-rings')).toBeGreaterThan(0);expect(count('well-posts')).toBe(count('well-rings')*3);expect(count('well-roofs')).toBe(count('well-rings'));
  expect(count('stall-counters')).toBeGreaterThan(0);expect(count('stall-posts')).toBe(count('stall-counters')*4);expect(count('stall-awnings')).toBe(count('stall-counters'));
  expect(count('cargo-stacks')).toBeGreaterThan(0);expect(count('pottery-jars')).toBeGreaterThan(0);
  expect(count('banner-poles')).toBeGreaterThan(0);expect(count('banners')).toBe(count('banner-poles'));
  expect(count('cart-wheels')).toBe(count('cart-bodies')*4);expect(count('cart-shafts')).toBe(count('cart-bodies')*2);
});

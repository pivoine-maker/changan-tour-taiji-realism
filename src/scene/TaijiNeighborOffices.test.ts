import {Box3,Group,Mesh,Texture,Vector3} from 'three';
import {createImperialPrecinctSet} from './ImperialAssets';
import {createHistoricalMaterialLibrary} from './HistoricalAssets';
import {imperialPrecincts} from '../data/imperialCity';
import {createPilotMaterials} from './TaijiPilot';
import {createTaijiNeighborOffices} from './TaijiArchitecture';
import {getTaijiNeighborOffices,officeRoofFrame,TAIJI_NEIGHBOR_OFFICE_IDS} from './TaijiNeighborOffices';

function pilotMaterials(){return createPilotMaterials({stone:new Texture(),roof:new Texture(),wood:new Texture(),wall:new Texture(),earth:new Texture()});}

it('selects exactly the eight imperial-axis office buildings',()=>{
  const offices=getTaijiNeighborOffices();
  expect(offices.map(h=>h.id)).toEqual([...TAIJI_NEIGHBOR_OFFICE_IDS]);
  expect(offices.every(h=>h.role==='office')).toBe(true);
  expect(offices.map(h=>[h.x,h.z])).toEqual([[158,108],[230,108],[158,136],[230,136],[146,122],[170,122],[218,122],[242,122]]);
});

it('keeps each old roof XZ envelope while aligning the ridge geometry to the long axis',()=>{
  for(const hall of getTaijiNeighborOffices()){
    const frame=officeRoofFrame(hall);
    const worldWidth=Math.abs(Math.cos(frame.rotation))*frame.width+Math.abs(Math.sin(frame.rotation))*frame.depth;
    const worldDepth=Math.abs(Math.sin(frame.rotation))*frame.width+Math.abs(Math.cos(frame.rotation))*frame.depth;
    const oldRotation=hall.rotation??0;
    const oldWorldWidth=Math.abs(Math.cos(oldRotation))* (hall.width+1.4)+Math.abs(Math.sin(oldRotation))*(hall.depth+1.2);
    const oldWorldDepth=Math.abs(Math.sin(oldRotation))* (hall.width+1.4)+Math.abs(Math.cos(oldRotation))*(hall.depth+1.2);
    expect(worldWidth).toBeCloseTo(oldWorldWidth,5);expect(worldDepth).toBeCloseTo(oldWorldDepth,5);
    expect(frame.width).toBeGreaterThan(frame.depth);
  }
});

it('copies exact source podium and stair bounds into independently owned pilot geometry',()=>{
  const source=createImperialPrecinctSet(createHistoricalMaterialLibrary(),imperialPrecincts);
  source.updateMatrixWorld(true);
  const sourceHall=source.getObjectByName('imperial-hall-west-chancellery') as Group;
  const sourceStone:Mesh[]=[];sourceHall.traverse(o=>{if(o instanceof Mesh&&['palace-podium','palace-step'].includes(o.name))sourceStone.push(o);});
  const replacement=createTaijiNeighborOffices(source,pilotMaterials());
  const copied=replacement.getObjectByName('refined-west-chancellery')!.getObjectByName('preserved-office-foundation') as Group;
  const copyMeshes:Mesh[]=[];copied.traverse(o=>{if(o instanceof Mesh)copyMeshes.push(o);});
  expect(copyMeshes).toHaveLength(sourceStone.length);
  const sourceBounds=new Box3();sourceStone.forEach(mesh=>sourceBounds.union(new Box3().setFromObject(mesh)));
  const copiedBounds=new Box3().setFromObject(copied);
  expect(copiedBounds.min.distanceTo(sourceBounds.min)).toBeLessThan(1e-5);
  expect(copiedBounds.max.distanceTo(sourceBounds.max)).toBeLessThan(1e-5);
  sourceStone.forEach((mesh,index)=>expect(copyMeshes[index].geometry).not.toBe(mesh.geometry));
});

it('preserves foundation placement beneath a transformed source root',()=>{
  const source=createImperialPrecinctSet(createHistoricalMaterialLibrary(),imperialPrecincts);
  source.position.set(31,4,-18);source.rotation.y=.37;source.scale.set(1.15,.9,.82);source.updateMatrixWorld(true);
  const original=source.getObjectByName('imperial-hall-west-chancellery')!.getObjectByName('palace-podium') as Mesh;
  const replacement=createTaijiNeighborOffices(source,pilotMaterials());source.add(replacement);source.updateMatrixWorld(true);
  const copied=replacement.getObjectByName('refined-west-chancellery')!.getObjectByName('palace-podium') as Mesh;
  const originalBounds=new Box3().setFromObject(original),copiedBounds=new Box3().setFromObject(copied);
  expect(copiedBounds.min.distanceTo(originalBounds.min)).toBeLessThan(1e-5);
  expect(copiedBounds.max.distanceTo(originalBounds.max)).toBeLessThan(1e-5);
  expect(copied.getWorldPosition(new Vector3()).distanceTo(original.getWorldPosition(new Vector3()))).toBeLessThan(1e-5);
});

it('builds finite bounded office roofs and framed recessed frontages',()=>{
  const source=createImperialPrecinctSet(createHistoricalMaterialLibrary(),imperialPrecincts);
  const replacement=createTaijiNeighborOffices(source,pilotMaterials());
  expect(replacement.children).toHaveLength(8);
  for(const office of replacement.children){
    const roof=office.getObjectByName('curved-hip-roof') as Mesh;
    expect(roof).toBeDefined();expect(office.getObjectByName('office-recessed-frontage')).toBeDefined();
    const bounds=new Box3().setFromObject(office);expect(bounds.max.y).toBeLessThan(10);
    const position=roof.geometry.getAttribute('position');for(const value of position.array)expect(Number.isFinite(value)).toBe(true);
  }
});

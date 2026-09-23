import * as THREE from 'three';
import type { ChanganCityModel, CityWard } from '../data/changanCity';
import type { BuildingBlock } from '../data/world';
import type { HistoricalMaterialLibrary } from './HistoricalAssets';
import {northGateSourceId} from './TaijiInstanceFilter';

interface InstanceTransform {
  sourceId?:string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
}

interface WardContext {
  ward: CityWard;
  index: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
}

interface OrdinaryWardLayout {
  lanes: InstanceTransform[];
  courtyardPaving: InstanceTransform[];
  foundations: InstanceTransform[];
  roofSlopes: InstanceTransform[];
  roofRidges: InstanceTransform[];
  eaves: InstanceTransform[];
  timberColumns: InstanceTransform[];
  timberLintels: InstanceTransform[];
  doorPanels: InstanceTransform[];
  windowPanels: InstanceTransform[];
  thresholds: InstanceTransform[];
  wellRings: InstanceTransform[];
  wellPosts: InstanceTransform[];
  wellRoofs: InstanceTransform[];
  stallCounters: InstanceTransform[];
  stallPosts: InstanceTransform[];
  stallAwnings: InstanceTransform[];
  cartBodies: InstanceTransform[];
  cartWheels: InstanceTransform[];
  cartShafts: InstanceTransform[];
  residentBodies: InstanceTransform[];
  residentHeads: InstanceTransform[];
  cargoStacks: InstanceTransform[];
  potteryJars: InstanceTransform[];
  bannerPoles: InstanceTransform[];
  banners: InstanceTransform[];
  shrubs: InstanceTransform[];
  drainStones: InstanceTransform[];
  hitchingPosts: InstanceTransform[];
}

const WEST_MARKET_CORE = { minX: -42, maxX: 42, minZ: -34, maxZ: 34 };

export function isOrdinaryWardDetailTarget(ward: CityWard): boolean {
  return ward.bounds.maxX < WEST_MARKET_CORE.minX
    || ward.bounds.minX > WEST_MARKET_CORE.maxX
    || ward.bounds.maxZ < WEST_MARKET_CORE.minZ
    || ward.bounds.minZ > WEST_MARKET_CORE.maxZ;
}

export function createOrdinaryWardDetails(
  materials: HistoricalMaterialLibrary,
  city: ChanganCityModel,
  options: { realistic?: boolean } = {}
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'full-city-ordinary-ward-details';
  const wards = city.wards.filter(isOrdinaryWardDetailTarget);
  const layout = createLayout(wards, city.gatehouses, options.realistic ?? false);

  root.add(createBoxLayer('ordinary-ward-inner-lanes', layout.lanes, materials.packedEarth, false, true));
  root.add(createBoxLayer('ordinary-ward-courtyard-paving', layout.courtyardPaving, materials.stone, false, true));
  root.add(createBoxLayer('ordinary-ward-foundations', layout.foundations, materials.stone, false, true));
  root.add(createBoxLayer('ordinary-ward-roof-slopes', layout.roofSlopes, materials.roofTile, true, true));
  root.add(createCylinderLayer('ordinary-ward-roof-ridges', layout.roofRidges, materials.roofRidge, true));
  root.add(createCylinderLayer('ordinary-ward-eaves', layout.eaves, materials.roofRidge, true));
  root.add(createCylinderLayer('ordinary-ward-timber-columns', layout.timberColumns, materials.woodDark, false));
  root.add(createBoxLayer('ordinary-ward-timber-lintels', layout.timberLintels, materials.woodDark));
  root.add(createBoxLayer('ordinary-ward-door-panels', layout.doorPanels, materials.woodDark));
  root.add(createBoxLayer('ordinary-ward-window-panels', layout.windowPanels, materials.charcoal));
  root.add(createBoxLayer('ordinary-ward-thresholds', layout.thresholds, materials.stone));
  root.add(createTorusLayer('ordinary-ward-well-rings', layout.wellRings, materials.stone));
  root.add(createCylinderLayer('ordinary-ward-well-posts', layout.wellPosts, materials.woodDark));
  root.add(createConeLayer('ordinary-ward-well-roofs', layout.wellRoofs, materials.roofTile, true));
  root.add(createBoxLayer('ordinary-ward-stall-counters', layout.stallCounters, materials.wood));
  root.add(createCylinderLayer('ordinary-ward-stall-posts', layout.stallPosts, materials.woodDark));
  root.add(createBoxLayer('ordinary-ward-stall-awnings', layout.stallAwnings, materials.fabricOchre));
  root.add(createBoxLayer('ordinary-ward-cart-bodies', layout.cartBodies, materials.wood));
  root.add(createCylinderLayer('ordinary-ward-cart-wheels', layout.cartWheels, materials.woodDark));
  root.add(createCylinderLayer('ordinary-ward-cart-shafts', layout.cartShafts, materials.woodDark));
  root.add(createConeLayer('ordinary-ward-resident-bodies', layout.residentBodies, materials.fabricIndigo));
  root.add(createSphereLayer('ordinary-ward-resident-heads', layout.residentHeads, materials.skin));
  root.add(createBoxLayer('ordinary-ward-cargo-stacks', layout.cargoStacks, materials.wood));
  root.add(createSphereLayer('ordinary-ward-pottery-jars', layout.potteryJars, materials.pottery));
  root.add(createCylinderLayer('ordinary-ward-banner-poles', layout.bannerPoles, materials.woodDark));
  root.add(createBoxLayer('ordinary-ward-banners', layout.banners, materials.fabricRed));
  root.add(createIcosahedronLayer('ordinary-ward-shrub-clusters', layout.shrubs, materials.foliageLight));
  root.add(createBoxLayer('ordinary-ward-drain-stones', layout.drainStones, materials.stone));
  root.add(createCylinderLayer('ordinary-ward-hitching-posts', layout.hitchingPosts, materials.stone));

  for (const child of [...root.children]) if (child instanceof THREE.InstancedMesh && child.count === 0) { root.remove(child); child.geometry.dispose(); }
  return root;
}

function createLayout(wards: CityWard[], gatehouses: BuildingBlock[], realistic: boolean): OrdinaryWardLayout {
  const layout = emptyLayout();
  const ordinaryBuildings = wards.flatMap((ward) => ward.buildings);

  wards.forEach((ward, index) => {
    const local=emptyLayout();addWardLayout(local,createWardContext(ward,index));
    if(ward.courts?.length || realistic) { placeWardLifeInCourts(local,ward);filterWardLifeProps(local,ward); }
    for(const key of Object.keys(layout) as (keyof OrdinaryWardLayout)[]) layout[key].push(...local[key]);
  });
  if (!realistic) ordinaryBuildings.forEach((building,index)=>addBuildingLayout(layout,building,index));
  if (!realistic) gatehouses.forEach((building,gateIndex)=>addBuildingLayout(layout,building,ordinaryBuildings.length+gateIndex,northGateSourceId(building,gatehouses)));

  return layout;
}

function propExtents(p:InstanceTransform):{rx:number;rz:number} {
  const rotation=new THREE.Matrix4().makeRotationY(p.rotationY??0).multiply(new THREE.Matrix4().makeRotationX(p.rotationX??0)).multiply(new THREE.Matrix4().makeRotationZ(p.rotationZ??0));
  const e=rotation.elements;
  return {rx:1.2*(Math.abs(e[0])*p.width+Math.abs(e[4])*p.height+Math.abs(e[8])*p.depth),rz:1.2*(Math.abs(e[2])*p.width+Math.abs(e[6])*p.height+Math.abs(e[10])*p.depth)};
}

/** Reuse the existing life assemblies, now grounded in the actual open courts.
 * The conservative footprint packer avoids court trees and already placed props;
 * it never grows counts or places an object in the navigable central cross.
 */
function placeWardLifeInCourts(layout:OrdinaryWardLayout,ward:CityWard):void {
  if(!ward.courts?.length)return;
  type Rect={minX:number;maxX:number;minZ:number;maxZ:number};
  const reserved:Rect[]=ward.trees.map(t=>({minX:t.x-.9,maxX:t.x+.9,minZ:t.z-.9,maxZ:t.z+.9}));
  const overlap=(a:Rect,b:Rect)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
  const place=(parts:InstanceTransform[],minimumCourt=0)=>{
    if(!parts.length)return false;
    const bounds:Rect={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
    for(const p of parts){const {rx,rz}=propExtents(p);bounds.minX=Math.min(bounds.minX,p.x-rx);bounds.maxX=Math.max(bounds.maxX,p.x+rx);bounds.minZ=Math.min(bounds.minZ,p.z-rz);bounds.maxZ=Math.max(bounds.maxZ,p.z+rz);}
    const width=bounds.maxX-bounds.minX,depth=bounds.maxZ-bounds.minZ;
    for(const court of ward.courts!){
      const c=court.bounds;
      if(c.maxX-c.minX<Math.max(minimumCourt,width+.4)||c.maxZ-c.minZ<Math.max(minimumCourt,depth+.4))continue;
      for(const x of [c.minX+.2,c.maxX-width-.2])for(const z of [c.minZ+.2,c.maxZ-depth-.2]){
        const next={minX:x,maxX:x+width,minZ:z,maxZ:z+depth};
        if(reserved.some(r=>overlap(next,r)))continue;
        for(const p of parts){p.x+=x-bounds.minX;p.z+=z-bounds.minZ;}
        reserved.push({minX:next.minX-.25,maxX:next.maxX+.25,minZ:next.minZ-.25,maxZ:next.maxZ+.25});return true;
      }
    }
    return false;
  };
  const assembly=(keys:(keyof OrdinaryWardLayout)[],enabled:boolean,minimum:number)=>{
    if(!enabled||!place(keys.flatMap(k=>layout[k]),minimum))for(const k of keys)layout[k]=[];
  };
  assembly(['wellRings','wellPosts','wellRoofs'],ward.character==='courtyard'||ward.character==='garden',4);
  // A small pre-existing workshop stall fits courts that cannot take the former street awning.
  if(ward.character==='artisan')for(const key of ['stallCounters','stallPosts','stallAwnings'] as const){
    const anchor=layout.stallCounters[0];
    if(anchor){const x=anchor.x,z=anchor.z;for(const p of layout[key]){p.x=x+(p.x-x)*.7;p.z=z+(p.z-z)*.7;p.width*=.7;p.depth*=.7;}}
  }
  assembly(['stallCounters','stallPosts','stallAwnings'],ward.character==='artisan',4);
  assembly(['cartBodies','cartWheels','cartShafts'],ward.character==='artisan',4);
  const bodies:InstanceTransform[]=[],heads:InstanceTransform[]=[];
  layout.residentBodies.forEach((body,i)=>{const head=layout.residentHeads[i];if(place([body,head])){bodies.push(body);heads.push(head);}});
  layout.residentBodies=bodies;layout.residentHeads=heads;
  // People take priority; small working-yard objects fill only remaining safe corners.
  layout.cargoStacks=ward.character==='artisan'?layout.cargoStacks.filter(p=>place([p])):[];
  layout.potteryJars=layout.potteryJars.filter(p=>place([p]));
  assembly(['bannerPoles','banners'],ward.character==='artisan',0);
}

/** Keep whole assemblies together: a rejected cart must not leave floating wheels.
 * Use conservative transformed extents, including cylinder radii and tilted shafts.
 */
function filterWardLifeProps(layout:OrdinaryWardLayout,ward:CityWard):void {
  const groups:(keyof OrdinaryWardLayout)[][]=[
    ['wellRings','wellPosts','wellRoofs'],['stallCounters','stallPosts','stallAwnings'],
    ['cartBodies','cartWheels','cartShafts'],
    ['bannerPoles','banners'],['cargoStacks'],['potteryJars'],['shrubs'],['drainStones'],['hitchingPosts']
  ];
  const cx=(ward.bounds.minX+ward.bounds.maxX)/2,cz=(ward.bounds.minZ+ward.bounds.maxZ)/2;
  const safe=(p:InstanceTransform)=>{
    const {rx,rz}=propExtents(p);
    if(Math.abs(p.x-cx)<3+rx||Math.abs(p.z-cz)<3+rz)return false;
    if(p.x-rx<ward.bounds.minX+1.5||p.x+rx>ward.bounds.maxX-1.5||p.z-rz<ward.bounds.minZ+1.5||p.z+rz>ward.bounds.maxZ-1.5)return false;
    return ward.buildings.every(b=>{
      const c=Math.abs(Math.cos(b.rotation??0)),s=Math.abs(Math.sin(b.rotation??0));
      const bx=c*(b.width+1.1)/2+s*(b.depth+1.1)/2;
      const bz=s*(b.width+1.1)/2+c*(b.depth+1.1)/2;
      return Math.abs(p.x-b.x)>=rx+bx||Math.abs(p.z-b.z)>=rz+bz;
    });
  };
  const retained=layout.residentBodies.map((p,i)=>safe(p)&&safe(layout.residentHeads[i]));
  layout.residentBodies=layout.residentBodies.filter((_,i)=>retained[i]);
  layout.residentHeads=layout.residentHeads.filter((_,i)=>retained[i]);
  for(const keys of groups){
    if(keys.length===1)layout[keys[0]]=layout[keys[0]].filter(safe);
    else if(keys.some(key=>layout[key].some(p=>!safe(p))))for(const key of keys)layout[key]=[];
  }
}

function emptyLayout(): OrdinaryWardLayout {
  return {
    lanes: [],
    courtyardPaving: [],
    foundations: [],
    roofSlopes: [],
    roofRidges: [],
    eaves: [],
    timberColumns: [],
    timberLintels: [],
    doorPanels: [],
    windowPanels: [],
    thresholds: [],
    wellRings: [],
    wellPosts: [],
    wellRoofs: [],
    stallCounters: [],
    stallPosts: [],
    stallAwnings: [],
    cartBodies: [],
    cartWheels: [],
    cartShafts: [],
    residentBodies: [],
    residentHeads: [],
    cargoStacks: [],
    potteryJars: [],
    bannerPoles: [],
    banners: [],
    shrubs: [],
    drainStones: [],
    hitchingPosts: []
  };
}

function createWardContext(ward: CityWard, index: number): WardContext {
  return {
    ward,
    index,
    centerX: (ward.bounds.minX + ward.bounds.maxX) / 2,
    centerZ: (ward.bounds.minZ + ward.bounds.maxZ) / 2,
    width: ward.bounds.maxX - ward.bounds.minX,
    depth: ward.bounds.maxZ - ward.bounds.minZ
  };
}

function addWardLayout(layout: OrdinaryWardLayout, context: WardContext): void {
  const { ward, index, centerX, centerZ, width, depth } = context;
  const laneHeight = 0.08;
  layout.lanes.push(
    box(centerX, 0.27, centerZ, width - 5, laneHeight, 1.45),
    box(centerX, 0.275, centerZ, 3.6, laneHeight, depth - 5)
  );

  const wellX = ward.bounds.minX + 4.4 + (index % 3) * 0.65;
  const wellZ = centerZ + ((index % 2) * 2 - 1) * 2.4;
  layout.wellRings.push(transform(wellX, 0.48, wellZ, 0.78, 0.78, 0.28, Math.PI / 2));
  layout.wellPosts.push(
    cylinder(wellX - 0.78, 1.35, wellZ, 0.12, 1.9),
    cylinder(wellX + 0.78, 1.35, wellZ, 0.12, 1.9),
    cylinder(wellX, 2.18, wellZ, 0.1, 1.85, Math.PI / 2, 0, Math.PI / 2)
  );
  layout.wellRoofs.push(transform(wellX, 2.35, wellZ, 1.25, 0.72, 1.25, 0, Math.PI / 4));

  const stallX = ward.bounds.maxX - 5.2;
  const stallZ = centerZ + (index % 3 - 1) * 2.1;
  if (index % 2 === 0) {
    layout.stallCounters.push(box(stallX, 0.76, stallZ, 3.2, 0.55, 1.15, index % 4 < 2 ? 0 : Math.PI / 2));
    for (const [offsetX, offsetZ] of [[-1.35, -0.46], [1.35, -0.46], [-1.35, 0.46], [1.35, 0.46]]) {
      const rotated = rotateOffset(offsetX, offsetZ, index % 4 < 2 ? 0 : Math.PI / 2);
      layout.stallPosts.push(cylinder(stallX + rotated.x, 1.62, stallZ + rotated.z, 0.075, 2.5));
    }
    layout.stallAwnings.push(box(stallX, 2.72, stallZ, 3.75, 0.16, 2.15, index % 4 < 2 ? 0 : Math.PI / 2, -0.08));
  }

  if (index % 4 === 1) {
    const cartRotation = index % 8 < 4 ? 0 : Math.PI / 2;
    const cartX = centerX + (index % 3 - 1) * 2.8;
    const cartZ = centerZ + 3.4;
    layout.cartBodies.push(box(cartX, 0.82, cartZ, 2.8, 0.7, 1.55, cartRotation));
    for (const localX of [-1.1, 1.1]) {
      for (const localZ of [-0.84, 0.84]) {
        const offset = rotateOffset(localX, localZ, cartRotation);
        layout.cartWheels.push(cylinder(cartX + offset.x, 0.64, cartZ + offset.z, 0.55, 0.18, cartRotation, 0, Math.PI / 2));
      }
    }
    for (const localX of [-0.48, 0.48]) {
      const offset = rotateOffset(localX, 2.35, cartRotation);
      layout.cartShafts.push(cylinder(cartX + offset.x, 0.54, cartZ + offset.z, 0.07, 3.2, cartRotation, Math.PI / 2));
    }
  }

  addResidents(layout, context);
  addStreetProps(layout, context);
  addVegetation(layout, context);
}

function addResidents(layout: OrdinaryWardLayout, context: WardContext): void {
  const { index, centerX, centerZ, width } = context;
  const positions = [
    { x: centerX - width * 0.12, z: centerZ - 1.8 },
    { x: centerX + width * 0.11, z: centerZ + 1.5 },
    { x: centerX + (index % 3 - 1) * 2.2, z: centerZ - 4.1 }
  ];
  positions.forEach((position, personIndex) => {
    const height = 1.32 + ((index + personIndex) % 3) * 0.08;
    layout.residentBodies.push(transform(position.x, 0.46 + height / 2, position.z, 0.42, height, 0.42, 0, (index + personIndex) * 0.83));
    layout.residentHeads.push(transform(position.x, height + 0.67, position.z, 0.28, 0.33, 0.28));
  });
}

function addStreetProps(layout: OrdinaryWardLayout, context: WardContext): void {
  const { ward, index, centerX, centerZ } = context;
  const cargoX = ward.bounds.maxX - 4.2;
  const cargoZ = centerZ - 3.6;
  layout.cargoStacks.push(
    box(cargoX, 0.48, cargoZ, 0.95, 0.72, 0.9, index * 0.37),
    box(cargoX + 0.7, 0.36, cargoZ + 0.55, 0.72, 0.5, 0.7, -index * 0.22)
  );
  layout.potteryJars.push(
    transform(ward.bounds.minX + 7.1, 0.6, ward.bounds.maxZ - 4.2, 0.45, 0.72, 0.45),
    transform(ward.bounds.minX + 7.9, 0.48, ward.bounds.maxZ - 4.6, 0.34, 0.56, 0.34)
  );

  if (index % 3 === 0) {
    const bannerX = centerX + (index % 2 === 0 ? -2.2 : 2.2);
    const bannerZ = ward.bounds.minZ + 1.7;
    layout.bannerPoles.push(cylinder(bannerX, 2.0, bannerZ, 0.075, 3.5));
    layout.banners.push(box(bannerX + 0.48, 2.75, bannerZ, 0.85, 1.05, 0.08, 0, index % 2 === 0 ? 0.08 : -0.08));
  }

  for (const offset of [-7.2, -2.4, 2.4, 7.2]) {
    layout.drainStones.push(box(centerX + offset, 0.34, centerZ + 1.05, 1.1, 0.14, 0.48, index % 2 === 0 ? 0 : Math.PI));
  }
  layout.hitchingPosts.push(
    cylinder(centerX - 5.4, 0.72, centerZ - 1.9, 0.16, 1.05),
    cylinder(centerX + 5.4, 0.72, centerZ + 1.9, 0.16, 1.05)
  );
}

function addVegetation(layout: OrdinaryWardLayout, context: WardContext): void {
  const { ward, index } = context;
  const positions = [
    [ward.bounds.minX + 2.4, ward.bounds.minZ + 2.8],
    [ward.bounds.maxX - 2.6, ward.bounds.minZ + 2.5],
    [ward.bounds.minX + 2.8, ward.bounds.maxZ - 2.7],
    [ward.bounds.maxX - 2.4, ward.bounds.maxZ - 2.9],
    [ward.bounds.minX + 5.8 + (index % 3), ward.bounds.maxZ - 2.5],
    [ward.bounds.maxX - 6.2, ward.bounds.minZ + 2.7 + (index % 2)]
  ];
  positions.forEach(([x, z], positionIndex) => {
    const size = 0.48 + ((index + positionIndex) % 3) * 0.14;
    layout.shrubs.push(transform(x, 0.45 + size * 0.18, z, size, size * 0.72, size));
  });
}

function addBuildingLayout(layout: OrdinaryWardLayout, building: BuildingBlock, index: number,sourceId?:string): void {
  const starts=new Map<InstanceTransform[],number>();for(const list of Object.values(layout))starts.set(list,list.length);
  const rotationY = building.rotation ?? 0;
  const roofDepth = building.depth + 1.55;
  const roofWidth = building.width + 1.8;
  const halfRoofDepth = roofDepth / 2;
  const roofRise = building.roof === 'flat' ? 0.72 : Math.max(1.15, building.depth * 0.24);
  const slopeLength = Math.sqrt(halfRoofDepth * halfRoofDepth + roofRise * roofRise);
  const slopeAngle = Math.atan2(roofRise, halfRoofDepth);
  const eaveY = building.height + 0.58;

  layout.foundations.push(box(building.x, 0.38, building.z, building.width + 0.72, 0.34, building.depth + 0.72, rotationY));
  for (const side of [-1, 1]) {
    const roofCenter = buildingOffset(building, 0, side * halfRoofDepth * 0.5);
    layout.roofSlopes.push(transform(
      roofCenter.x,
      eaveY + roofRise / 2,
      roofCenter.z,
      roofWidth,
      0.18,
      slopeLength,
      side * slopeAngle,
      rotationY
    ));
    const eaveCenter = buildingOffset(building, 0, side * halfRoofDepth);
    layout.eaves.push(cylinder(eaveCenter.x, eaveY + 0.03, eaveCenter.z, 0.11, roofWidth, rotationY, 0, Math.PI / 2));
  }
  layout.roofRidges.push(cylinder(building.x, eaveY + roofRise + 0.09, building.z, 0.14, roofWidth + 0.35, rotationY, 0, Math.PI / 2));

  const facadeZ = building.depth / 2 + 0.07;
  const columnHeight = Math.max(1.85, building.height * 0.78);
  for (const ratio of [-0.4, -0.14, 0.14, 0.4]) {
    const columnPosition = buildingOffset(building, building.width * ratio, facadeZ);
    layout.timberColumns.push(cylinder(columnPosition.x, 0.38 + columnHeight / 2, columnPosition.z, 0.09, columnHeight, rotationY));
  }
  const lintelPosition = buildingOffset(building, 0, facadeZ + 0.02);
  layout.timberLintels.push(box(lintelPosition.x, building.height - 0.36, lintelPosition.z, building.width * 0.88, 0.16, 0.18, rotationY));
  layout.doorPanels.push(box(lintelPosition.x, 1.25, lintelPosition.z + Math.cos(rotationY) * 0.03, Math.min(1.35, building.width * 0.2), 1.82, 0.16, rotationY));
  for (const ratio of [-0.27, 0.27]) {
    const windowPosition = buildingOffset(building, building.width * ratio, facadeZ + 0.025);
    layout.windowPanels.push(box(windowPosition.x, 1.38, windowPosition.z, Math.min(1.5, building.width * 0.18), 0.88, 0.13, rotationY));
  }

  const thresholdPosition = buildingOffset(building, 0, building.depth / 2 + 0.62);
  layout.thresholds.push(box(thresholdPosition.x, 0.42, thresholdPosition.z, Math.min(2.3, building.width * 0.34), 0.18, 0.78, rotationY));
  const courtyardPosition = buildingOffset(building, 0, building.depth / 2 + 1.7);
  layout.courtyardPaving.push(box(courtyardPosition.x, 0.28, courtyardPosition.z, building.width + 1.5, 0.08, 2.6, rotationY));

  if (index % 3 === 0 || sourceId) {
    for (const side of [-1, 1]) {
      const ridgeEnd = buildingOffset(building, side * (roofWidth / 2 + 0.18), 0);
      layout.potteryJars.push(transform(ridgeEnd.x, eaveY + roofRise + 0.2, ridgeEnd.z, 0.17, 0.34, 0.17));
    }
  }
  if(sourceId)for(const list of Object.values(layout))for(let item=starts.get(list)!;item<list.length;item++)list[item].sourceId=sourceId;
}

function createBoxLayer(
  name: string,
  transforms: InstanceTransform[],
  material: THREE.Material,
  castShadow = false,
  receiveShadow = false
): THREE.InstancedMesh {
  return createInstanceLayer(name, new THREE.BoxGeometry(1, 1, 1), transforms, material, castShadow, receiveShadow);
}

function createCylinderLayer(
  name: string,
  transforms: InstanceTransform[],
  material: THREE.Material,
  castShadow = false
): THREE.InstancedMesh {
  return createInstanceLayer(name, new THREE.CylinderGeometry(1, 1, 1, 8), transforms, material, castShadow);
}

function createSphereLayer(name: string, transforms: InstanceTransform[], material: THREE.Material): THREE.InstancedMesh {
  return createInstanceLayer(name, new THREE.SphereGeometry(1, 8, 6), transforms, material);
}

function createConeLayer(
  name: string,
  transforms: InstanceTransform[],
  material: THREE.Material,
  castShadow = false
): THREE.InstancedMesh {
  return createInstanceLayer(name, new THREE.ConeGeometry(1, 1, 8), transforms, material, castShadow);
}

function createTorusLayer(name: string, transforms: InstanceTransform[], material: THREE.Material): THREE.InstancedMesh {
  return createInstanceLayer(name, new THREE.TorusGeometry(1, 0.18, 6, 12), transforms, material);
}

function createIcosahedronLayer(name: string, transforms: InstanceTransform[], material: THREE.Material): THREE.InstancedMesh {
  return createInstanceLayer(name, new THREE.IcosahedronGeometry(1, 0), transforms, material);
}

function createInstanceLayer(
  name: string,
  geometry: THREE.BufferGeometry,
  transforms: InstanceTransform[],
  material: THREE.Material,
  castShadow = false,
  receiveShadow = false
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.name = name;
  transforms.forEach((item, index) => setTransformInstance(mesh, index, item));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.userData.sourceIds=transforms.map(item=>item.sourceId??null);
  return mesh;
}

function setTransformInstance(mesh: THREE.InstancedMesh, index: number, item: InstanceTransform): void {
  const translation = new THREE.Matrix4().makeTranslation(item.x, item.y, item.z);
  const rotationY = new THREE.Matrix4().makeRotationY(item.rotationY ?? 0);
  const rotationX = new THREE.Matrix4().makeRotationX(item.rotationX ?? 0);
  const rotationZ = new THREE.Matrix4().makeRotationZ(item.rotationZ ?? 0);
  const scale = new THREE.Matrix4().makeScale(item.width, item.height, item.depth);
  mesh.setMatrixAt(index, translation.multiply(rotationY).multiply(rotationX).multiply(rotationZ).multiply(scale));
}

function box(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  rotationY = 0,
  rotationX = 0
): InstanceTransform {
  return transform(x, y, z, width, height, depth, rotationX, rotationY);
}

function cylinder(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  rotationY = 0,
  rotationX = 0,
  rotationZ = 0
): InstanceTransform {
  return { x, y, z, width: radius, height, depth: radius, rotationX, rotationY, rotationZ };
}

function transform(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0
): InstanceTransform {
  return { x, y, z, width, height, depth, rotationX, rotationY, rotationZ };
}

function buildingOffset(building: BuildingBlock, localX: number, localZ: number): { x: number; z: number } {
  const rotated = rotateOffset(localX, localZ, building.rotation ?? 0);
  return { x: building.x + rotated.x, z: building.z + rotated.z };
}

function rotateOffset(localX: number, localZ: number, rotationY: number): { x: number; z: number } {
  return {
    x: localX * Math.cos(rotationY) + localZ * Math.sin(rotationY),
    z: -localX * Math.sin(rotationY) + localZ * Math.cos(rotationY)
  };
}

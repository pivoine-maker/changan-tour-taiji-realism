import * as THREE from 'three';
export const FAR_LEAF_RETENTION_STRIDE=2;

export function calculateLeafPlanformArea(geometry:THREE.BufferGeometry):number {
  const position=geometry.getAttribute('position'),index=geometry.getIndex();
  const count=index?.count??position.count;
  let area=0;
  for(let offset=0;offset<count;offset+=3) {
    const ia=index?index.getX(offset):offset,ib=index?index.getX(offset+1):offset+1,ic=index?index.getX(offset+2):offset+2;
    const ax=position.getX(ia),az=position.getZ(ia),bx=position.getX(ib),bz=position.getZ(ib),cx=position.getX(ic),cz=position.getZ(ic);
    area+=Math.abs((bx-ax)*(cz-az)-(bz-az)*(cx-ax))*.5;
  }
  return area;
}

export function calculateFarLeafAreaScale(near:THREE.BufferGeometry,far:THREE.BufferGeometry,retentionStride=FAR_LEAF_RETENTION_STRIDE):number {
  const nearArea=calculateLeafPlanformArea(near),farArea=calculateLeafPlanformArea(far);
  if(!(nearArea>0&&farArea>0&&Number.isFinite(retentionStride)&&retentionStride>=1))throw new Error('Leaf geometries require positive planform area and retention stride');
  return Math.sqrt(retentionStride*nearArea/farArea);
}
/** Unit-length folded blade; instance frames apply authored PCA dimensions. */
export function createTaijiLeafGeometry():THREE.BufferGeometry {
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,-.5,-.18,-.015,-.20,-.22,-.025,.10,0,.015,.5,.22,-.025,.10,.18,-.015,-.20,0,.03,-.02
  ],3));
  // Select the same green leaf in the CC0 atlas, preserving its midrib and pigment variation.
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([
    .02,.59,.078,.565,.13,.59,.24,.68,.172,.697,.10,.657,.12,.63
  ],2));
  geometry.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);
  geometry.computeVertexNormals();return geometry;
}

/** Compact equivalent of the four-corner silhouette used by distant canopy instances. */
export function createTaijiFarLeafGeometry():THREE.BufferGeometry {
  const source=createTaijiLeafGeometry();
  const selected=[0,2,3,4];
  const geometry=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv']) {
    const attribute=source.getAttribute(name);
    const values:number[]=[];
    for(const vertex of selected) for(let component=0;component<attribute.itemSize;component++) {
      values.push(attribute.getComponent(vertex,component));
    }
    geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,attribute.itemSize));
  }
  geometry.setIndex([0,1,2,0,2,3]);
  source.dispose();
  return geometry;
}

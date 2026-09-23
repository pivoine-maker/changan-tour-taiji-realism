import * as THREE from 'three';
import { copyGeometryAttributes, expandInstancedGeometry } from './PathTraceGeometry';
// @ts-expect-error Pinned dependency exposes this implementation without declarations.
import { mergeGeometries } from '../../node_modules/three-gpu-pathtracer/src/core/utils/mergeGeometries.js';

function triangleGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ], 3));
  geometry.setIndex([0, 1, 2]);
  return geometry;
}

it('preserves RGB instance colors through the installed path tracer RGBA merge',()=>{
  const uncolored=triangleGeometry();
  uncolored.setAttribute('color',new THREE.Float32BufferAttribute(Array(12).fill(1),4));
  const mesh=new THREE.InstancedMesh(triangleGeometry(),new THREE.MeshStandardMaterial(),1);
  mesh.setColorAt(0,new THREE.Color(.8,.7,.6));
  const expanded=expandInstancedGeometry(mesh);
  const merged=new THREE.BufferGeometry();
  mergeGeometries([uncolored,expanded],{},merged);
  const color=merged.getAttribute('color');
  for(let i=3;i<6;i++){
    expect(color.getX(i)).toBeCloseTo(.8);expect(color.getY(i)).toBeCloseTo(.7);
    expect(color.getZ(i)).toBeCloseTo(.6);expect(color.getW(i)).toBe(1);
  }
});

it.each([3,4])('normalizes owned color buffers to Float32 RGBA while preserving source channels (%s)',size=>{
  const geometry=triangleGeometry();
  const rgba=[128,192,64,127];
  const source=new THREE.Uint8BufferAttribute(Array.from({length:3},()=>rgba.slice(0,size)).flat(),size,true);
  geometry.setAttribute('color',source);
  const copy=copyGeometryAttributes(geometry).getAttribute('color');
  expect(copy.itemSize).toBe(4);expect(copy.array).toBeInstanceOf(Float32Array);
  expect(copy.getX(0)).toBeCloseTo(128/255);expect(copy.getW(0)).toBeCloseTo(size===4?127/255:1);
  copy.setX(0,0);expect(source.getX(0)).toBeCloseTo(128/255);
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial(),1);
  mesh.setColorAt(0,new THREE.Color(.5,.5,.5));
  const expanded=expandInstancedGeometry(mesh).getAttribute('color');
  expect(expanded.itemSize).toBe(4);expect(expanded.getX(0)).toBeCloseTo(64/255);
  expect(expanded.getW(0)).toBeCloseTo(size===4?127/255:1);
});

it('combines world and active instance transforms into exact bounds', () => {
  const source = triangleGeometry();
  const mesh = new THREE.InstancedMesh(source, new THREE.MeshBasicMaterial(), 3);
  mesh.count = 2;
  mesh.position.set(10, 20, 30);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(1, 2, 3));
  mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(-4, 5, -6));
  mesh.updateMatrixWorld(true);

  const expanded = expandInstancedGeometry(mesh);
  expanded.computeBoundingBox();

  expect(expanded.getAttribute('position').count).toBe(6);
  expect(expanded.boundingBox!.min.toArray()).toEqual([6, 22, 24]);
  expect(expanded.boundingBox!.max.toArray()).toEqual([12, 26, 33]);
  expect(source.getAttribute('position').count).toBe(3);
  expect(source.index!.array).toEqual(new Uint16Array([0, 1, 2]));
});

it('multiplies source vertex colors by instance colors without changing either source', () => {
  const source = triangleGeometry();
  const sourceColors = new THREE.Float32BufferAttribute([
    1, 0.5, 0.25,
    0.5, 1, 0.25,
    0.25, 0.5, 1,
  ], 3);
  source.setAttribute('color', sourceColors);
  const mesh = new THREE.InstancedMesh(source, new THREE.MeshBasicMaterial(), 1);
  mesh.setColorAt(0, new THREE.Color(0.5, 0.25, 0.75));
  const before = Array.from(sourceColors.array);

  const expanded = expandInstancedGeometry(mesh);

  expect(Array.from(expanded.getAttribute('color').array)).toEqual([
    0.5, 0.125, 0.1875, 1,
    0.25, 0.25, 0.1875, 1,
    0.125, 0.125, 0.75, 1,
  ]);
  expect(Array.from(sourceColors.array)).toEqual(before);
  expect(mesh.instanceColor!.getX(0)).toBe(0.5);
});

it('creates vertex colors when only instance colors exist', () => {
  const mesh = new THREE.InstancedMesh(triangleGeometry(), new THREE.MeshBasicMaterial(), 1);
  mesh.setColorAt(0, new THREE.Color(0.25, 0.5, 0.75));
  const expanded = expandInstancedGeometry(mesh);
  expect(Array.from(expanded.getAttribute('color').array)).toEqual([
    0.25, 0.5, 0.75, 1,
    0.25, 0.5, 0.75, 1,
    0.25, 0.5, 0.75, 1,
  ]);
});

it('normalizes normals after rotation and nonuniform scale', () => {
  const source = triangleGeometry();
  const diagonal = Math.SQRT1_2;
  source.setAttribute('normal', new THREE.Float32BufferAttribute([
    diagonal, diagonal, 0,
    diagonal, diagonal, 0,
    diagonal, diagonal, 0,
  ], 3));
  const mesh = new THREE.InstancedMesh(source, new THREE.MeshBasicMaterial(), 1);
  mesh.setMatrixAt(0, new THREE.Matrix4().compose(
    new THREE.Vector3(),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
    new THREE.Vector3(2, 1, 3),
  ));

  const normal = expandInstancedGeometry(mesh).getAttribute('normal');
  const expected = new THREE.Vector3(-diagonal, diagonal / 2, 0).normalize();
  expect(normal.getX(0)).toBeCloseTo(expected.x);
  expect(normal.getY(0)).toBeCloseTo(expected.y);
  expect(new THREE.Vector3(normal.getX(0), normal.getY(0), normal.getZ(0)).length()).toBeCloseTo(1);
});

it('copies interleaved attributes, indices, groups, and draw range into owned buffers', () => {
  const packed = new Float32Array([
    0, 0, 0, 0, 0,
    1, 0, 0, 1, 0,
    0, 1, 0, 0, 1,
  ]);
  const interleaved = new THREE.InterleavedBuffer(packed, 5);
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.InterleavedBufferAttribute(interleaved, 3, 0));
  source.setAttribute('uv', new THREE.InterleavedBufferAttribute(interleaved, 2, 3));
  source.setIndex([0, 1, 2]);
  source.addGroup(0, 3, 2);
  source.setDrawRange(1, 2);

  const copied = copyGeometryAttributes(source);
  const position = copied.getAttribute('position');
  const uv = copied.getAttribute('uv');

  expect(position).toBeInstanceOf(THREE.BufferAttribute);
  expect(uv).toBeInstanceOf(THREE.BufferAttribute);
  expect(Array.from(position.array)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  expect(Array.from(uv.array)).toEqual([0, 0, 1, 0, 0, 1]);
  expect(copied.index).not.toBe(source.index);
  expect(Array.from(copied.index!.array)).toEqual([0, 1, 2]);
  expect(copied.groups).toEqual([{ start: 0, count: 3, materialIndex: 2 }]);
  expect(copied.drawRange).toEqual({ start: 1, count: 2 });
  packed[0] = 99;
  expect(position.getX(0)).toBe(0);
});

it('rejects expansion over the vertex budget before allocating output', () => {
  const mesh = new THREE.InstancedMesh(triangleGeometry(), new THREE.MeshBasicMaterial(), 2);
  expect(() => expandInstancedGeometry(mesh, 5)).toThrow(/vertex budget/i);
});

it('selects and rebases an indexed draw range and its intersecting groups', () => {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
  ], 3));
  source.setIndex([0, 1, 2, 0, 2, 3]);
  source.addGroup(0, 3, 4);
  source.addGroup(3, 3, 7);
  source.setDrawRange(3, 3);
  const mesh = new THREE.InstancedMesh(source, new THREE.MeshBasicMaterial(), 2);

  const expanded = expandInstancedGeometry(mesh);

  expect(Array.from(expanded.index!.array)).toEqual([0, 2, 3, 4, 6, 7]);
  expect(expanded.groups).toEqual([
    { start: 0, count: 3, materialIndex: 7 },
    { start: 3, count: 3, materialIndex: 7 },
  ]);
  expect(expanded.drawRange).toEqual({ start: 0, count: 6 });
});

it('selects a nonindexed draw range and corrects mirrored triangle winding', () => {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.Float32BufferAttribute([
    -2, 0, 0, -1, 0, 0, -2, 1, 0,
    0, 0, 0, 1, 0, 0, 0, 1, 0,
  ], 3));
  source.setDrawRange(3, 3);
  const mesh = new THREE.InstancedMesh(source, new THREE.MeshBasicMaterial(), 1);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeScale(-1, 1, 1));

  const expanded = expandInstancedGeometry(mesh);

  expect(Array.from(expanded.index!.array)).toEqual([3, 5, 4]);
  expect(expanded.drawRange).toEqual({ start: 0, count: 3 });
});

it.each([true, false])('emits an empty index for a zero-count draw range (indexed=%s)', (indexed) => {
  const source = triangleGeometry();
  if (!indexed) source.setIndex(null);
  source.setDrawRange(0, 0);
  const mesh = new THREE.InstancedMesh(source, new THREE.MeshBasicMaterial(), 2);

  const expanded = expandInstancedGeometry(mesh);

  expect(expanded.index).not.toBeNull();
  expect(expanded.index!.count).toBe(0);
  expect(expanded.drawRange).toEqual({ start: 0, count: 0 });
});

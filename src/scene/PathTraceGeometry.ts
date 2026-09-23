import * as THREE from 'three';
import type { TypedArray, TypedArrayConstructor } from 'three';

function ownedAttribute(source: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, count = source.count): THREE.BufferAttribute {
  const ArrayType = source.array.constructor as TypedArrayConstructor;
  const result = new THREE.BufferAttribute(new ArrayType(count * source.itemSize), source.itemSize, source.normalized);
  result.name = source.name;
  if (source instanceof THREE.BufferAttribute) {
    result.setUsage(source.usage);
    result.gpuType = source.gpuType;
  } else {
    result.setUsage(source.data.usage);
  }
  return result;
}

function copyAttributeValues(
  source: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  target: THREE.BufferAttribute,
  sourceOffset = 0,
  targetOffset = 0,
  count = source.count,
): void {
  for (let vertex = 0; vertex < count; vertex += 1) {
    for (let component = 0; component < source.itemSize; component += 1) {
      target.setComponent(targetOffset + vertex, component, source.getComponent(sourceOffset + vertex, component));
    }
  }
}

/** Clones a geometry's index and attributes into independently owned, non-interleaved buffers. */
export function copyGeometryAttributes(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const result = new THREE.BufferGeometry();

  for (const [name, source] of Object.entries(geometry.attributes)) {
    // The pinned path tracer supplies absent colors as Float32 RGBA and its merger
    // assumes identical strides/types. RGB attributes otherwise corrupt later meshes.
    const target = name === 'color' ? new THREE.BufferAttribute(new Float32Array(source.count * 4), 4) : ownedAttribute(source);
    if (name === 'color') {
      for (let i = 0; i < source.count; i++) target.setXYZW(i, source.getX(i), source.getY(i), source.getZ(i), source.itemSize >= 4 ? source.getW(i) : 1);
    } else copyAttributeValues(source, target);
    result.setAttribute(name, target);
  }

  if (geometry.index) {
    const ArrayType = geometry.index.array.constructor as TypedArrayConstructor;
    const indexArray = new ArrayType(geometry.index.count);
    for (let index = 0; index < geometry.index.count; index += 1) indexArray[index] = geometry.index.getX(index);
    result.setIndex(new THREE.BufferAttribute(indexArray, 1));
  }

  for (const group of geometry.groups) result.addGroup(group.start, group.count, group.materialIndex);
  result.setDrawRange(geometry.drawRange.start, geometry.drawRange.count);
  result.name = geometry.name;
  result.userData = { ...geometry.userData };
  return result;
}

function expandedIndexArray(vertexCount: number, indexCount: number): TypedArray {
  const ArrayType = vertexCount > 65_535 ? Uint32Array : Uint16Array;
  return new ArrayType(indexCount);
}

/** Expands the active instances into world-space geometry suitable for path tracing. */
export function expandInstancedGeometry(
  mesh: THREE.InstancedMesh,
  maxVertices = 8_000_000,
): THREE.BufferGeometry {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  if (!position) throw new Error('Instanced geometry must have a position attribute.');

  const instanceCount = Math.max(0, Math.min(mesh.count, mesh.instanceMatrix.count));
  const expandedVertexCount = position.count * instanceCount;
  if (!Number.isSafeInteger(expandedVertexCount) || expandedVertexCount > maxVertices) {
    throw new Error(`Expanded geometry exceeds vertex budget (${expandedVertexCount} > ${maxVertices}).`);
  }

  const result = new THREE.BufferGeometry();
  const targets = new Map<string, THREE.BufferAttribute>();
  for (const [name, source] of Object.entries(geometry.attributes)) {
    const target = name === 'color'
      ? new THREE.BufferAttribute(new Float32Array(expandedVertexCount * 4), 4)
      : name === 'position' || name === 'normal' || name === 'tangent'
      ? new THREE.BufferAttribute(new Float32Array(expandedVertexCount * source.itemSize), source.itemSize)
      : ownedAttribute(source, expandedVertexCount);
    target.name = source.name;
    targets.set(name, target);
    result.setAttribute(name, target);
  }
  if (mesh.instanceColor && !targets.has('color')) {
    const color = new THREE.BufferAttribute(new Float32Array(expandedVertexCount * 4), 4);
    targets.set('color', color);
    result.setAttribute('color', color);
  }

  const sourceIndex = geometry.index;
  const sourceElementCount = sourceIndex?.count ?? position.count;
  const drawStart = Math.max(0, Math.min(sourceElementCount, Math.floor(geometry.drawRange.start)));
  const requestedDrawCount = Number.isFinite(geometry.drawRange.count)
    ? Math.max(0, Math.floor(geometry.drawRange.count))
    : sourceElementCount - drawStart;
  const indicesPerInstance = Math.min(requestedDrawCount, sourceElementCount - drawStart);
  const targetIndex = new THREE.BufferAttribute(
    expandedIndexArray(expandedVertexCount, indicesPerInstance * instanceCount),
    1,
  );
  result.setIndex(targetIndex);
  result.setDrawRange(0, indicesPerInstance * instanceCount);

  mesh.updateWorldMatrix(true, false);
  const instanceMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const vector = new THREE.Vector3();
  const instanceColor = new THREE.Color();

  for (let instance = 0; instance < instanceCount; instance += 1) {
    mesh.getMatrixAt(instance, instanceMatrix);
    worldMatrix.multiplyMatrices(mesh.matrixWorld, instanceMatrix);
    normalMatrix.getNormalMatrix(worldMatrix);
    const vertexOffset = instance * position.count;
    const determinantSign = worldMatrix.determinant() < 0 ? -1 : 1;
    if (mesh.instanceColor) mesh.getColorAt(instance, instanceColor);

    for (const [name, source] of Object.entries(geometry.attributes)) {
      const target = targets.get(name)!;
      if (name !== 'position' && name !== 'normal' && name !== 'tangent' && name !== 'color') {
        copyAttributeValues(source, target, 0, vertexOffset);
      }
    }

    const targetPosition = targets.get('position')!;
    const sourceNormal = geometry.getAttribute('normal');
    const targetNormal = targets.get('normal');
    const sourceTangent = geometry.getAttribute('tangent');
    const targetTangent = targets.get('tangent');
    const sourceColor = geometry.getAttribute('color');
    const targetColor = targets.get('color');

    for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
      const outputIndex = vertexOffset + vertexIndex;
      vector.set(position.getX(vertexIndex), position.getY(vertexIndex), position.getZ(vertexIndex)).applyMatrix4(worldMatrix);
      targetPosition.setXYZ(outputIndex, vector.x, vector.y, vector.z);
      for (let component = 3; component < targetPosition.itemSize; component += 1) {
        targetPosition.setComponent(outputIndex, component, position.getComponent(vertexIndex, component));
      }

      if (sourceNormal && targetNormal) {
        vector.set(sourceNormal.getX(vertexIndex), sourceNormal.getY(vertexIndex), sourceNormal.getZ(vertexIndex));
        vector.applyNormalMatrix(normalMatrix);
        targetNormal.setXYZ(outputIndex, vector.x, vector.y, vector.z);
      }
      if (sourceTangent && targetTangent) {
        vector.set(sourceTangent.getX(vertexIndex), sourceTangent.getY(vertexIndex), sourceTangent.getZ(vertexIndex));
        vector.transformDirection(worldMatrix);
        targetTangent.setXYZW(outputIndex, vector.x, vector.y, vector.z, sourceTangent.getW(vertexIndex) * determinantSign);
      }
      if (targetColor) {
        const red = sourceColor ? sourceColor.getX(vertexIndex) : 1;
        const green = sourceColor ? sourceColor.getY(vertexIndex) : 1;
        const blue = sourceColor ? sourceColor.getZ(vertexIndex) : 1;
        targetColor.setXYZ(
          outputIndex,
          red * (mesh.instanceColor ? instanceColor.r : 1),
          green * (mesh.instanceColor ? instanceColor.g : 1),
          blue * (mesh.instanceColor ? instanceColor.b : 1),
        );
        targetColor.setW(outputIndex, sourceColor && sourceColor.itemSize >= 4 ? sourceColor.getW(vertexIndex) : 1);
      }
    }

    const indexOffset = instance * indicesPerInstance;
    for (let index = 0; index < indicesPerInstance; index += 1) {
      let selectedIndex = index;
      const triangleStart = index - index % 3;
      if (determinantSign < 0 && triangleStart + 2 < indicesPerInstance && index % 3 !== 0) {
        selectedIndex = index % 3 === 1 ? index + 1 : index - 1;
      }

      const sourceElement = drawStart + selectedIndex;
      const sourceVertex = sourceIndex ? sourceIndex.getX(sourceElement) : sourceElement;
      targetIndex.setX(indexOffset + index, sourceVertex + vertexOffset);
    }

    for (const group of geometry.groups) {
      const clippedStart = Math.max(group.start, drawStart);
      const clippedEnd = Math.min(group.start + group.count, drawStart + indicesPerInstance);
      if (clippedEnd > clippedStart) {
        result.addGroup(
          indexOffset + clippedStart - drawStart,
          clippedEnd - clippedStart,
          group.materialIndex,
        );
      }
    }
  }

  result.name = geometry.name;
  result.userData = { ...geometry.userData };
  return result;
}

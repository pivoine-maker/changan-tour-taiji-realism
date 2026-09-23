import * as THREE from 'three';

export interface TaijiLeafPlacement {
  p: readonly [number, number, number];
  n: readonly [number, number, number];
  t: readonly [number, number, number];
  /** PCA dimensions: longest in-plane axis, in-plane width, and plane thickness. */
  d: readonly [number, number, number];
}

const LEAF_GEOMETRY_WIDTH = 0.44;
const LEAF_GEOMETRY_FOLD_DEPTH = 0.055;
const MIN_LENGTH = 0.04;
const MAX_LENGTH = 0.32;
const MIN_WIDTH_RATIO = 0.25;
const MAX_WIDTH_RATIO = 0.8;

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizedOr(vector: THREE.Vector3, fallback: THREE.Vector3): THREE.Vector3 {
  return vector.lengthSq() > 1e-12 && Number.isFinite(vector.lengthSq())
    ? vector.normalize()
    : vector.copy(fallback);
}

function perpendicularTo(normal: THREE.Vector3): THREE.Vector3 {
  const reference = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  return reference.addScaledVector(normal, -reference.dot(normal)).normalize();
}

/** Maps one authored PCA leaf component into the transformed tree's world frame. */
export function calculateLeafFrame(
  leaf: TaijiLeafPlacement,
  treeMatrix: THREE.Matrix4,
  baseY: number,
  retentionFraction: number,
): THREE.Matrix4 {
  const sourceNormal = normalizedOr(new THREE.Vector3().fromArray(leaf.n), new THREE.Vector3(0, 1, 0));
  const sourceTangent = new THREE.Vector3().fromArray(leaf.t);
  sourceTangent.addScaledVector(sourceNormal, -sourceTangent.dot(sourceNormal));
  normalizedOr(sourceTangent, perpendicularTo(sourceNormal));
  const sourceWidthAxis = new THREE.Vector3().crossVectors(sourceNormal, sourceTangent).normalize();

  const linear = new THREE.Matrix3().setFromMatrix4(treeMatrix);
  const transformedTangent = sourceTangent.clone().applyMatrix3(linear);
  const transformedWidth = sourceWidthAxis.clone().applyMatrix3(linear);
  const transformedThickness = sourceNormal.clone().applyMatrix3(linear);
  const tangentScale = finitePositive(transformedTangent.length(), 1);
  const widthScale = finitePositive(transformedWidth.length(), 1);
  const thicknessScale = finitePositive(transformedThickness.length(), 1);

  const worldTangent = normalizedOr(transformedTangent, new THREE.Vector3(0, 0, 1));
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(treeMatrix);
  const worldNormal = sourceNormal.clone().applyMatrix3(normalMatrix);
  normalizedOr(worldNormal, perpendicularTo(worldTangent));
  const worldWidthAxis = new THREE.Vector3().crossVectors(worldNormal, worldTangent);
  normalizedOr(worldWidthAxis, perpendicularTo(worldTangent));
  worldNormal.crossVectors(worldTangent, worldWidthAxis).normalize();

  const retention = THREE.MathUtils.clamp(finitePositive(retentionFraction, 1), 1e-4, 1);
  const densityCompensation = Math.sqrt(1 / retention);
  const sourceLength = finitePositive(leaf.d[0], 0.08);
  const sourceWidthRatio = THREE.MathUtils.clamp(
    finitePositive(leaf.d[1], sourceLength * 0.44) / sourceLength,
    MIN_WIDTH_RATIO,
    MAX_WIDTH_RATIO,
  );
  const length = THREE.MathUtils.clamp(sourceLength * tangentScale * densityCompensation, MIN_LENGTH, MAX_LENGTH);
  const transformedWidthRatio = sourceWidthRatio * widthScale / tangentScale;
  const width = length * THREE.MathUtils.clamp(transformedWidthRatio, MIN_WIDTH_RATIO, MAX_WIDTH_RATIO);
  const rawThickness = finitePositive(leaf.d[2], sourceLength * 0.06) * thicknessScale * densityCompensation;
  const thickness = THREE.MathUtils.clamp(rawThickness, 0.002, width * 0.5);

  const position = new THREE.Vector3().fromArray(leaf.p);
  position.y -= baseY;
  position.applyMatrix4(treeMatrix);

  return new THREE.Matrix4()
    .makeBasis(worldWidthAxis, worldNormal, worldTangent)
    .scale(new THREE.Vector3(width / LEAF_GEOMETRY_WIDTH, thickness / LEAF_GEOMETRY_FOLD_DEPTH, length))
    .setPosition(position);
}

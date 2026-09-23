import * as THREE from 'three';

export interface PathTraceEnvironment {
  texture: THREE.DataTexture;
  environmentIntensity: number;
}

/** Converts existing hemisphere irradiance into environment radiance; owns no input resources. */
export function createPathTraceEnvironment(
  source: THREE.DataTexture,
  hemispheres: readonly THREE.HemisphereLight[],
  environmentIntensity: number,
  environmentRotation: THREE.Euler,
): PathTraceEnvironment {
  if (!Number.isFinite(environmentIntensity) || environmentIntensity < 0) throw new Error('Environment intensity must be finite and nonnegative.');
  if (source.format !== THREE.RGBAFormat || (source.type !== THREE.FloatType && source.type !== THREE.HalfFloatType)) {
    throw new Error('Path tracing environment requires an RGBA Float or HalfFloat HDR texture.');
  }
  const { width, height, data } = source.image;
  if (!data || !width || !height || data.length !== width * height * 4) throw new Error('Invalid HDR dimensions.');
  const effectiveIntensity = environmentIntensity > 0 ? environmentIntensity : 1;
  // A zero original intensity suppresses HDR radiance, but not the separate hemisphere lights.
  const hdrScale = environmentIntensity / effectiveIntensity;
  const lights = hemispheres.map(light => {
    light.updateWorldMatrix(true, false);
    return {
      direction: new THREE.Vector3().setFromMatrixPosition(light.matrixWorld).normalize(),
      constant: light.color.clone().add(light.groundColor).multiplyScalar(light.intensity / (2 * Math.PI * effectiveIntensity)),
      linear: light.color.clone().sub(light.groundColor).multiplyScalar(3 * light.intensity / (4 * Math.PI * effectiveIntensity)),
    };
  });
  const pixels = new Float32Array(data.length);
  const direction = new THREE.Vector3();
  const rotation = new THREE.Matrix4().makeRotationFromEuler(environmentRotation);
  const decode = (value: number) => source.type === THREE.HalfFloatType ? THREE.DataUtils.fromHalfFloat(value) : value;
  for (let y = 0; y < height; y++) {
    // RGBELoader sets flipY=true. Normalize to GPU UV order, as EquirectHdrInfoUniform does.
    const sourceY = source.flipY ? height - 1 - y : y;
    const phi = Math.PI * (1 - (y + .5) / height);
    for (let x = 0; x < width; x++) {
      const theta = 2 * Math.PI * ((x + .5) / width - .5);
      // Path tracer samples inverse(environmentRotation) * worldDirection.
      direction.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).transformDirection(rotation);
      const output = (y * width + x) * 4, input = (sourceY * width + x) * 4;
      let red = decode(Number(data[input])) * hdrScale;
      let green = decode(Number(data[input + 1])) * hdrScale;
      let blue = decode(Number(data[input + 2])) * hdrScale;
      for (const light of lights) {
        const cosine = direction.dot(light.direction);
        red += light.constant.r + light.linear.r * cosine;
        green += light.constant.g + light.linear.g * cosine;
        blue += light.constant.b + light.linear.b * cosine;
      }
      // High-contrast hemisphere colors need negative SH radiance; do not silently clamp and change energy.
      if (Math.min(red, green, blue) < -1e-7) throw new Error('Hemisphere conversion requires negative radiance for these colors.');
      pixels[output] = Math.max(0, red); pixels[output + 1] = Math.max(0, green); pixels[output + 2] = Math.max(0, blue);
      pixels[output + 3] = decode(Number(data[input + 3]));
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.name = 'path-trace-existing-light-environment';
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false; texture.flipY = false; texture.needsUpdate = true;
  return { texture, environmentIntensity: effectiveIntensity };
}

import * as THREE from 'three';
import type { DiscoveryId } from '../data/discoveries';
import { createTaijiDiscoveryIndicators } from './TaijiDiscoveryIndicators';

function makeContainer(width = 800, height = 600): HTMLDivElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: width });
  Object.defineProperty(container, 'clientHeight', { value: height });
  document.body.append(container);
  return container;
}

function makeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 100);
  camera.position.set(0, 4.4, 0);
  camera.lookAt(0, 4.4, -1);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

function markers(...entries: Array<[DiscoveryId, THREE.Mesh]>): Map<DiscoveryId, THREE.Mesh> {
  return new Map(entries);
}

it('is disabled by default, hides markers only while enabled, and restores initial visibility', () => {
  const container = makeContainer();
  const visible = new THREE.Mesh();
  const initiallyHidden = new THREE.Mesh();
  visible.position.set(0, 4.4, -10);
  initiallyHidden.position.set(0, 4.4, -10);
  visible.updateMatrixWorld(true);
  initiallyHidden.updateMatrixWorld(true);
  initiallyHidden.visible = false;
  const controller = createTaijiDiscoveryIndicators(container, markers(
    ['west-gate', visible],
    ['market-office', initiallyHidden],
  ));
  const layer = container.querySelector<HTMLElement>('[data-taiji-discovery-indicators]')!;

  expect(layer.style.display).toBe('none');
  expect(layer.style.pointerEvents).toBe('none');
  expect(visible.visible).toBe(true);
  expect(initiallyHidden.visible).toBe(false);
  controller.setEnabled(true);
  expect(layer.style.display).toBe('block');
  expect(visible.visible).toBe(false);
  expect(initiallyHidden.visible).toBe(false);
  controller.update(makeCamera());
  expect(container.querySelector<HTMLElement>('[data-discovery-id="west-gate"]')!.style.display).toBe('block');
  expect(container.querySelector<HTMLElement>('[data-discovery-id="market-office"]')!.style.display).toBe('none');
  controller.setEnabled(false);
  expect(visible.visible).toBe(true);
  expect(initiallyHidden.visible).toBe(false);
});

it('projects nested marker world coordinates and clips markers behind the camera', () => {
  const container = makeContainer();
  const parent = new THREE.Group();
  parent.position.set(2, 0, 0);
  const front = new THREE.Mesh();
  front.position.set(1, 4.4, -10);
  parent.add(front);
  const behind = new THREE.Mesh();
  behind.position.set(0, 4.4, 5);
  parent.add(behind);
  parent.updateMatrixWorld(true);
  const controller = createTaijiDiscoveryIndicators(container, markers(
    ['west-gate', front],
    ['market-office', behind],
  ));
  controller.setEnabled(true);
  controller.update(makeCamera());

  const frontIndicator = container.querySelector<HTMLElement>('[data-discovery-id="west-gate"]')!;
  const behindIndicator = container.querySelector<HTMLElement>('[data-discovery-id="market-office"]')!;
  const projected = new THREE.Vector3(3, 4.4, -10).project(makeCamera());
  expect(frontIndicator.style.display).toBe('block');
  expect(frontIndicator.style.transform).toBe(
    `translate3d(${(projected.x * 0.5 + 0.5) * 800}px, ${(-projected.y * 0.5 + 0.5) * 600}px, 0) translate(-50%, -50%)`,
  );
  expect(behindIndicator.style.display).toBe('none');
});

it('updates discovered visual and accessible state without changing marker colors', () => {
  const container = makeContainer();
  const material = new THREE.MeshBasicMaterial({ color: 0x123456 });
  const marker = new THREE.Mesh(new THREE.BoxGeometry(), material);
  const controller = createTaijiDiscoveryIndicators(container, markers(['taiji-hall', marker]));
  const indicator = container.querySelector<HTMLElement>('[data-discovery-id="taiji-hall"]')!;

  controller.setDiscovered(new Set<DiscoveryId>(['taiji-hall']));
  expect(indicator.textContent).toBe('✓');
  expect(indicator.dataset.discovered).toBe('true');
  expect(indicator.getAttribute('aria-label')).toContain('已发现');
  expect(indicator.title).toContain('已发现');
  expect(material.color.getHex()).toBe(0x123456);
  controller.setDiscovered([]);
  expect(indicator.textContent).not.toBe('✓');
  expect(indicator.dataset.discovered).toBe('false');
});

it('hides projected indicators outside the viewport', () => {
  const container = makeContainer();
  const marker = new THREE.Mesh();
  marker.position.set(100, 4.4, -10);
  marker.updateMatrixWorld(true);
  const controller = createTaijiDiscoveryIndicators(container, markers(['west-gate', marker]));
  controller.setEnabled(true);
  controller.update(makeCamera());
  expect(container.querySelector<HTMLElement>('[data-discovery-id="west-gate"]')!.style.display).toBe('none');
});

it('disposes idempotently, removes only its layer, and restores marker visibility', () => {
  const container = makeContainer();
  const sibling = document.createElement('span');
  container.append(sibling);
  const marker = new THREE.Mesh();
  const controller = createTaijiDiscoveryIndicators(container, markers(['west-gate', marker]));
  controller.setEnabled(true);
  controller.dispose();
  controller.dispose();
  expect(marker.visible).toBe(true);
  expect(container.querySelector('[data-taiji-discovery-indicators]')).toBeNull();
  expect(sibling.parentElement).toBe(container);
});

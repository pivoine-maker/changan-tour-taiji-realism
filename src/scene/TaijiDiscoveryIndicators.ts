import * as THREE from 'three';
import type { DiscoveryId } from '../data/discoveries';

export interface TaijiDiscoveryIndicators {
  setEnabled(enabled: boolean): void;
  setDiscovered(ids: Iterable<DiscoveryId>): void;
  update(camera: THREE.Camera): void;
  dispose(): void;
}

interface IndicatorRecord {
  id: DiscoveryId;
  marker: THREE.Mesh;
  initialVisible: boolean;
  element: HTMLSpanElement;
  display: string;
  screenX: number;
  screenY: number;
  discovered: boolean;
}

const GOLD = '#d9ad45';

function setDisplay(record: IndicatorRecord, display: string): void {
  if (record.display === display) return;
  record.display = display;
  record.element.style.display = display;
}

function setFound(record: IndicatorRecord, found: boolean): void {
  if (record.discovered === found) return;
  record.discovered = found;
  record.element.dataset.discovered = String(found);
  record.element.textContent = found ? '✓' : '⌖';
  record.element.style.background = found ? GOLD : 'transparent';
  record.element.style.color = found ? '#2b2116' : GOLD;
  const status = found ? '已发现' : '未发现';
  record.element.setAttribute('aria-label', `发现位置：${status}`);
  record.element.title = `发现位置：${status}`;
}

/** Creates a non-interactive screen-space replacement for discovery meshes. */
export function createTaijiDiscoveryIndicators(
  container: HTMLElement,
  markers: Map<DiscoveryId, THREE.Mesh>,
): TaijiDiscoveryIndicators {
  const layer = document.createElement('div');
  layer.dataset.taijiDiscoveryIndicators = '';
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    display: 'none',
  });

  const records: IndicatorRecord[] = [];
  for (const [id, marker] of markers) {
    const element = document.createElement('span');
    element.dataset.discoveryId = id;
    element.setAttribute('role', 'img');
    Object.assign(element.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '18px',
      height: '18px',
      boxSizing: 'border-box',
      border: `2px solid ${GOLD}`,
      borderRadius: '50%',
      fontSize: '14px',
      fontWeight: '700',
      lineHeight: '14px',
      textAlign: 'center',
      pointerEvents: 'none',
      display: 'none',
      textShadow: '0 1px 2px rgba(0,0,0,.65)',
    });
    const record: IndicatorRecord = {
      id,
      marker,
      initialVisible: marker.visible,
      element,
      display: 'none',
      screenX: Number.NaN,
      screenY: Number.NaN,
      discovered: true,
    };
    setFound(record, false);
    records.push(record);
    layer.append(element);
  }
  container.append(layer);

  const projected = new THREE.Vector3();
  let enabled = false;
  let disposed = false;

  return {
    setEnabled(nextEnabled: boolean): void {
      if (disposed || enabled === nextEnabled) return;
      enabled = nextEnabled;
      layer.style.display = enabled ? 'block' : 'none';
      for (const record of records) {
        record.marker.visible = enabled ? false : record.initialVisible;
        if (!enabled) setDisplay(record, 'none');
      }
    },

    setDiscovered(ids: Iterable<DiscoveryId>): void {
      if (disposed) return;
      const found = new Set(ids);
      for (const record of records) setFound(record, found.has(record.id));
    },

    update(camera: THREE.Camera): void {
      if (disposed || !enabled) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) {
        for (const record of records) setDisplay(record, 'none');
        return;
      }
      for (const record of records) {
        if (!record.initialVisible) {
          setDisplay(record, 'none');
          continue;
        }
        record.marker.getWorldPosition(projected);
        projected.project(camera);
        const onScreen = Number.isFinite(projected.x)
          && Number.isFinite(projected.y)
          && Number.isFinite(projected.z)
          && projected.z >= -1 && projected.z <= 1
          && projected.x >= -1 && projected.x <= 1
          && projected.y >= -1 && projected.y <= 1;
        if (!onScreen) {
          setDisplay(record, 'none');
          continue;
        }
        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;
        if (x !== record.screenX || y !== record.screenY) {
          record.screenX = x;
          record.screenY = y;
          record.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        }
        setDisplay(record, 'block');
      }
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const record of records) record.marker.visible = record.initialVisible;
      layer.remove();
    },
  };
}

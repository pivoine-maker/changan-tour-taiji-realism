import { zoomCameraTarget } from './zoomFocus';
import { createTaijiDiscoveryIndicators } from './TaijiDiscoveryIndicators';
import {createPoolReflectionProbe, type PoolReflectionProbe} from './TaijiPoolReflection';
import {ShadowRefresh} from './ShadowRefresh';
import type { TaijiPathTracingController } from './TaijiPathTracing';
import { batchStaticArchitecture } from './StaticBatch';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  getWorldCenter,
  westMarketWorld,
  type Avenue,
  type Landmark,
  type Point2,
  type WorldModel
} from '../data/world';
import { findTriggeredDiscovery } from '../discoveries/state';
import { createCityNavigation } from '../navigation/cityNavigation';
import type { CityDestination } from '../data/cityDestinations';
import { applyCityRealism } from './CityRealism';
import type { DiscoveryId } from '../data/discoveries';
import { createMapLabelSpecs, type MapLabelKind } from '../data/mapLabels';
import { questEntities, questNpcs, type QuestEntity, type QuestEntityId, type QuestNpc } from '../data/quests';
import {
  clampCameraDistance,
  clampCameraPitch,
  getDefaultCameraRig,
  getNextNpcIndex,
  getNpcCameraRig,
  getTravelerCameraRig,
  panCameraTarget,
  shouldFollowTraveler,
  updateFollowTarget
} from './cameraControls';
import {
  createHistoricalMaterialLibrary,
  createMarketDetailSet,
  createMarketGate,
  createTangBuilding
} from './HistoricalAssets';
import { createImperialPrecinctSet } from './ImperialAssets';
import { applyTaijiPilot, createPilotMaterials, loadPilotTextures, type PilotTextures } from './TaijiPilot';
import {fitDirectionalShadowToBounds} from './TaijiShadowFrustum';
import { createFullCitySet } from './FullCityAssets';
import { changanCity } from '../data/changanCity';
import {
  createKeyboardMoveState,
  getKeyboardMoveIntent,
  moveWithRoadSnap,
  resolveCollision,
  zoomCameraDistance
} from './inputControls';
import { getLabelVisibility, rectanglesOverlap, type LabelRect } from './labelProjection';
import { createMovementObstacles } from './movementObstacles';

// Keep the sky and direct sun aligned while giving the overview readable side light.
const TAIJI_DAYLIGHT_TURN = THREE.MathUtils.degToRad(60);

interface WestMarketSceneOptions {
  container: HTMLElement;
  onDiscovery: (id: DiscoveryId) => void;
  onQuestInteraction?: (id: QuestEntityId) => void;
  onMove?: (position: Point2) => void;
}

const COLORS = {
  markerLocked: 0x5c493a,
  markerFound: 0xe9c46a,
  traveler: 0xf1dcc0,
  travelerDark: 0x3a241c
};

interface SurfaceRect extends Point2 {
  width: number;
  depth: number;
}

export interface AvenueSurfaceSpec extends SurfaceRect {
  id: string;
  centerStripWidth: number;
  centerStrip: SurfaceRect;
  drainageChannels: SurfaceRect[];
  curbs: SurfaceRect[];
}

export interface QuestMarkerSpec extends Point2 {
  id: QuestEntityId;
  kind: QuestEntity['kind'];
  label: string;
  color: number;
  triggerRadius: number;
}

export function findNearbyQuestMarker(markers: QuestMarkerSpec[], position: Point2, activeId: QuestEntityId | null): QuestMarkerSpec | undefined {
  const withinReach = (marker: QuestMarkerSpec) => (position.x-marker.x)**2 + (position.z-marker.z)**2 <= marker.triggerRadius**2;
  return markers.find(marker => marker.id === activeId && withinReach(marker)) ?? markers.find(withinReach);
}

/** Optional reflection capture must not prevent the HDR-lit pilot from starting. */
export function tryCreatePoolReflectionProbe(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  waterMesh: THREE.Object3D,
  exclusions: THREE.Object3D[] = [],
): PoolReflectionProbe | undefined {
  try {
    return createPoolReflectionProbe(renderer, scene, waterMesh, exclusions);
  } catch (error) {
    console.warn('Pool reflection capture unavailable; retaining scene HDR.', error);
    return undefined;
  }
}

export function getWorldSurfaceLayout(bounds: WorldModel['bounds']): {
  center: Point2;
  board: { width: number; depth: number };
  boardSegments: SurfaceRect[];
  walkPlane: { width: number; depth: number };
} {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  return {
    center: getWorldCenter(bounds),
    board: { width: width + 12, depth: depth + 12 },
    boardSegments: [{ x: getWorldCenter(bounds).x, z: getWorldCenter(bounds).z, width: width + 12, depth: depth + 12 }],
    walkPlane: { width, depth }
  };
}

export function createAvenueSurfaceSpecs(avenues: Avenue[]): AvenueSurfaceSpec[] {
  return avenues.map((avenue) => {
    const isNorthSouth = avenue.orientation === 'north-south';
    const crossAxisSize = isNorthSouth ? avenue.width : avenue.depth;
    const centerStripWidth = Math.max(1.2, crossAxisSize * 0.1);
    const channelOffset = crossAxisSize / 2 - 2.2;
    const curbOffset = crossAxisSize / 2 + 0.35;
    const crossAxisRect = (offset: number, thickness: number): SurfaceRect => ({
      x: avenue.x + (isNorthSouth ? offset : 0),
      z: avenue.z + (isNorthSouth ? 0 : offset),
      width: isNorthSouth ? thickness : avenue.width,
      depth: isNorthSouth ? avenue.depth : thickness
    });

    return {
      id: avenue.id,
      x: avenue.x,
      z: avenue.z,
      width: avenue.width,
      depth: avenue.depth,
      centerStripWidth,
      centerStrip: crossAxisRect(0, centerStripWidth),
      drainageChannels: [-channelOffset, channelOffset].map((offset) => crossAxisRect(offset, 0.72)),
      curbs: [-curbOffset, curbOffset].map((offset) => crossAxisRect(offset, 0.58))
    };
  });
}

export function createQuestMarkerSpecs(entities: QuestEntity[]): QuestMarkerSpec[] {
  return entities.map((entity) => ({
    id: entity.id,
    kind: entity.kind,
    label: entity.name,
    x: entity.x,
    z: entity.z,
    triggerRadius: entity.triggerRadius,
    color: entity.kind === 'npc' ? 0x6fb6a8 : 0xe3b45d
  }));
}

export class WestMarketScene {
  private readonly container: HTMLElement;
  private readonly onDiscovery: (id: DiscoveryId) => void;
  private readonly onQuestInteraction?: (id: QuestEntityId) => void;
  private readonly onMove?: (position: Point2) => void;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1800);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly worldRoot = new THREE.Group();
  private readonly materials = createHistoricalMaterialLibrary();
  private readonly markerMeshes = new Map<DiscoveryId, THREE.Mesh>();
  private discoveryIndicators?: ReturnType<typeof createTaijiDiscoveryIndicators>;
  private readonly questMarkers = createQuestMarkerSpecs(questEntities);
  private readonly questMarkerGroups = new Map<QuestEntityId, THREE.Group>();
  private readonly placeLabels = createMapLabelSpecs(westMarketWorld);
  private readonly placeLabelLayer = document.createElement('div');
  private readonly placeLabelElements = new Map<string, HTMLElement>();
  private readonly labelWorldPosition = new THREE.Vector3();
  private readonly labelProjectedPosition = new THREE.Vector3();
  private readonly traveler = new THREE.Group();
  private readonly travelerRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xf1c87a,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide
  });
  private readonly keyboardMoveState = createKeyboardMoveState();
  private readonly movementObstacles = createMovementObstacles(westMarketWorld, changanCity);
  private readonly walkPlane: THREE.Mesh;
  private readonly clock = new THREE.Clock();
  private readonly cityNavigation = createCityNavigation(westMarketWorld.bounds, this.movementObstacles);
  private route: Point2[] = [];
  private cityRealism?: ReturnType<typeof applyCityRealism>;
  private cityLeaf?: THREE.Texture;
  private routeIndex = 0;
  private targetPosition = new THREE.Vector3(-34, 0.9, 0);
  private yaw = -0.72;
  private pitch = 0.82;
  private distance = 188;
  private readonly cameraTarget = new THREE.Vector3();
  private isDragging = false;
  private isPanning = false;
  private manuallyExploring = false;
  private followTraveler = true;
  private dragDistance = 0;
  private lastPointer = { x: 0, y: 0 };
  private currentNearbyDiscovery: DiscoveryId | null = null;
  private currentNearbyQuestEntity: QuestEntityId | null = null;
  private activeQuestEntityId: QuestEntityId | null = null;
  private locatedNpcId: QuestEntityId | null = null;
  private locatedNpcIndex = -1;
  private placeLabelsVisible = false;
  private phaseThroughActive = false;
  private animationFrame = 0;
  private pilot?: ReturnType<typeof applyTaijiPilot>;
  private pilotTextures?: PilotTextures;
  private pilotLight?: THREE.DirectionalLight;
  private pilotDaylight?: THREE.Group;
  private originalLights: THREE.Light[] = [];
  private disposed = false;
  private pilotComposer?: EffectComposer;
  private pilotAo?: SSAOPass;
  private pilotEnabled = false;
  private inspectingTimber = false;
  private pilotEnvironment?: THREE.WebGLRenderTarget;
  private pilotPoolReflection?: {texture:THREE.Texture;dispose():void};
  private pilotHdr?: THREE.DataTexture;
  private pathTracing?: TaijiPathTracingController;
  private pathTracingEnabled=false;
  private shadowRefresh=new ShadowRefresh();
  private pathPreparation?:Promise<TaijiPathTracingController>;
  private pathAbort?:AbortController;

  async prepareTaijiPilot(): Promise<void> {
    const textures = await loadPilotTextures(this.renderer.capabilities.getMaxAnisotropy());
    if (this.disposed) { Object.values(textures).forEach(texture => texture.dispose()); return; }
    this.pilotTextures = textures;
    this.cityLeaf = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}textures/city-ai-v34/leaf-spray.png`);
    this.cityLeaf.colorSpace = THREE.SRGBColorSpace;
    if (this.disposed) { this.cityLeaf.dispose(); return; }
    this.cityRealism = applyCityRealism(this.worldRoot, this.materials, textures, this.cityLeaf);
    this.pilot = applyTaijiPilot(this.worldRoot, createPilotMaterials(textures));
    this.cityRealism.finishInstallation();
    try {
      const {loadTaijiTrees}=await import('./TaijiTrees');
      const trees=await loadTaijiTrees();
      if(this.disposed){trees.dispose();return;}
      this.pilot.installTrees(trees);
    } catch(error) {console.warn('Detailed courtyard trees unavailable; procedural trees retained.',error);}

    const {RGBELoader}=await import('three/addons/loaders/RGBELoader.js');
    const hdri=await new RGBELoader().loadAsync(`${import.meta.env.BASE_URL}environment/kloofendal-sky.hdr`);
    if(this.disposed){hdri.dispose();return;}
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    this.pilotEnvironment=pmrem.fromEquirectangular(hdri);
    pmrem.dispose();this.pilotHdr=hdri;
    this.originalLights = this.scene.children.filter((child): child is THREE.Light => child instanceof THREE.Light);
    const daylight = new THREE.Group();
    daylight.name = 'taiji-daylight';
    const sky = new THREE.HemisphereLight(0xcbdbe8, 0xc9b99d, .95);
    daylight.add(sky);
    const sun = new THREE.DirectionalLight(0xfff4df, 3.8);
    sun.position.set(82.7, 122.6, 317.2);
    sun.target.position.set(194, 0, 205);
    sun.position.sub(sun.target.position).applyAxisAngle(new THREE.Vector3(0,1,0),TAIJI_DAYLIGHT_TURN).add(sun.target.position);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -.00012;
    sun.shadow.normalBias = .045;
    daylight.add(sun,sun.target);
    daylight.updateMatrixWorld(true);
    fitDirectionalShadowToBounds(sun);
    this.scene.add(daylight);
    this.pilotLight = sun;
    this.pilotDaylight = daylight;
    const target = new THREE.WebGLRenderTarget(this.container.clientWidth, this.container.clientHeight, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(this.renderer, target);
    composer.addPass(new RenderPass(this.scene,this.camera));
    const ao = new SSAOPass(this.scene,this.camera,1,1,12);
    const renderAo = ao.render.bind(ao);
    ao.render = (...args: Parameters<SSAOPass['render']>) => {
      const shadows = args[0].shadowMap.autoUpdate;
      args[0].shadowMap.autoUpdate = false;
      try { renderAo(...args); } finally { args[0].shadowMap.autoUpdate = shadows; }
    };
    ao.kernelRadius = 1.25;
    ao.minDistance = .0005;
    ao.maxDistance = .012;
    composer.addPass(ao);
    composer.addPass(new OutputPass());
    this.pilotComposer = composer;
    this.pilotAo = ao;
    this.resize();
    this.setTaijiPilotEnabled(true);
    const pool=this.worldRoot.getObjectByName('garden-pool-water');
    if(pool instanceof THREE.Mesh && pool.material instanceof THREE.MeshStandardMaterial) {
      const reflection=tryCreatePoolReflectionProbe(this.renderer,this.scene,pool,[this.traveler]);
      if(reflection) {
        this.pilotPoolReflection=reflection;
        pool.material.envMap=reflection.texture;
        pool.material.needsUpdate=true;
      }
    }


  }

  async setPathTracingEnabled(enabled:boolean,onStatus:(message:string)=>void):Promise<boolean> {
    this.pathTracingEnabled=enabled;
    if(!enabled)return false;
    if(!this.pilotEnabled||!this.pilotHdr)return false;
    try {
      if(!this.pathTracing){
        if(!this.pathPreparation){
          this.pathAbort=new AbortController();
          const signal=this.pathAbort.signal;
          this.pathPreparation=import('./TaijiPathTracing').then(({createTaijiPathTracing})=>{
            signal.throwIfAborted();
            return createTaijiPathTracing(this.renderer,this.scene,this.camera,this.pilotHdr!,this.traveler,onStatus,signal);
          });
        }
        const controller=await this.pathPreparation;
        if(this.disposed){controller.dispose();return false;}
        this.pathTracing=controller;
      }
      return this.pathTracingEnabled;
    } catch(error){this.pathTracingEnabled=false;onStatus(`静观光照未启用：${String(error)}`);return false;} finally {this.pathPreparation=undefined;}
  }

  setTaijiPilotEnabled(enabled: boolean): void {
    if(!enabled)this.pathTracingEnabled=false;
    this.pilotEnabled = enabled;
    this.discoveryIndicators?.setEnabled(enabled);
    this.renderer.shadowMap.autoUpdate=!enabled;this.renderer.shadowMap.needsUpdate=true;
    this.container.dataset.taijiRealism = String(enabled);
    this.scene.environment = enabled && this.pilotEnvironment ? this.pilotEnvironment.texture : null;
    this.scene.environmentIntensity = enabled ? .85 : .5;
    this.scene.environmentRotation.set(0,enabled ? THREE.MathUtils.degToRad(36.03515625-134.75)+TAIJI_DAYLIGHT_TURN : 0,0);
    this.pilot?.setEnabled(enabled);
    this.cityRealism?.setEnabled(enabled);
    if (this.pilotDaylight) this.pilotDaylight.visible = enabled;
    this.originalLights.forEach(light => light.visible = !enabled);
    this.scene.background = new THREE.Color(enabled ? 0xb8c5cb : 0x17100d);
    this.scene.fog = enabled ? new THREE.Fog(0xc4cdd0, 180, 590) : new THREE.Fog(0x17100d, 420, 980);
    this.renderer.toneMappingExposure = enabled ? 1.03 : 1.15;
  }

  focusDestination(destination: CityDestination): void {
    this.pathTracingEnabled = false; this.pathAbort?.abort();
    this.pathTracing?.dispose(); this.pathTracing = undefined;
    this.container.dispatchEvent(new CustomEvent('city-view-changed'));
    this.inspectingTimber = false;
    this.cameraTarget.set(destination.target.x, destination.targetY, destination.target.z);
    this.yaw = destination.yaw; this.pitch = destination.pitch; this.distance = destination.distance;
    this.followTraveler = false; this.manuallyExploring = true; this.updateCamera();
  }

  private updateCityLighting(): void {
    if (!this.pilotEnabled || !this.pilotLight) return;
    const fog = this.scene.fog;
    if (fog instanceof THREE.Fog) { fog.near = Math.max(180, this.distance * .9); fog.far = Math.max(590, this.distance + 650); }
    const taiji = this.cameraTarget.x >= 138 && this.cameraTarget.x <= 250 && this.cameraTarget.z >= 150 && this.distance < 230;
    const center = taiji ? new THREE.Vector3(194, 0, 205) : new THREE.Vector3(this.cameraTarget.x, 0, this.cameraTarget.z);
    const extent = Math.max(85, this.distance * .65);
    const offset = new THREE.Vector3(-111.3, 122.6, 112.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), TAIJI_DAYLIGHT_TURN);
    // Move the light farther back for broad views so the complete city lies in front of the shadow camera.
    if (!taiji) offset.multiplyScalar(Math.max(1, extent / 110));
    this.pilotLight.target.position.copy(center); this.pilotLight.position.copy(center).add(offset);
    fitDirectionalShadowToBounds(this.pilotLight, taiji ? undefined : new THREE.Box3(new THREE.Vector3(center.x-extent, 0, center.z-extent), new THREE.Vector3(center.x+extent, 25, center.z+extent)));
  }

  focusTaiji(): void {
    this.inspectingTimber = false;
    this.cameraTarget.set(194, 5, 203);
    this.yaw = -0.62;
    this.pitch = 0.61;
    this.distance = 110;
    this.followTraveler = false;
    this.manuallyExploring = true;
    this.updateCamera();
  }

  focusTaijiTrees():void {
    this.inspectingTimber=false;this.cameraTarget.set(233,4.2,175);
    this.yaw=-.62;this.pitch=.25;this.distance=23;
    this.followTraveler=false;this.manuallyExploring=true;this.updateCamera();
  }

  focusTaijiOblique(): void {
    this.inspectingTimber = false;
    this.cameraTarget.set(194, 4, 194);
    this.yaw = -.73;
    this.pitch = .83;
    this.distance = 150;
    this.followTraveler = false;
    this.manuallyExploring = true;
    this.updateCamera();
  }

  focusTaijiDetail(): void {
    this.inspectingTimber = false;
    this.cameraTarget.set(194, 6, 204);
    this.yaw = 2.65;
    this.pitch = .57;
    this.distance = 68;
    this.followTraveler = false;
    this.manuallyExploring = true;
    this.updateCamera();
  }

  focusTaijiTimber(): void {
    this.inspectingTimber = true;
    this.cameraTarget.set(194, 7, 208);
    this.yaw = Math.PI;
    this.pitch = .02;
    this.distance = 30;
    this.followTraveler = false;
    this.manuallyExploring = true;
    this.updateCamera();
  }

  constructor(options: WestMarketSceneOptions) {
    this.container = options.container;
    this.onDiscovery = options.onDiscovery;
    this.onQuestInteraction = options.onQuestInteraction;
    this.onMove = options.onMove;
    this.walkPlane = this.createWalkPlane();

    this.scene.background = new THREE.Color(0x17100d);
    this.scene.fog = new THREE.Fog(0x17100d, 420, 980);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.append(this.renderer.domElement);
    this.addPlaceLabelLayer();

    this.scene.add(this.worldRoot);
    this.buildScene();
    this.discoveryIndicators = createTaijiDiscoveryIndicators(this.container, this.markerMeshes);
    this.resetView();
    this.resize();
    this.attachEvents();
    this.animate();
  }

  resetView(): void {
    this.inspectingTimber = false;
    const cameraRig = getDefaultCameraRig();
    const center = getWorldCenter(westMarketWorld.bounds);
    this.yaw = cameraRig.yaw;
    this.pitch = cameraRig.pitch;
    this.distance = cameraRig.distance;
    this.cameraTarget.set(center.x, 0, center.z);
    this.followTraveler = false;
    this.manuallyExploring = false;
    this.updateCamera();
  }

  locateTraveler(): void {
    this.inspectingTimber = false;
    const travelerRig = getTravelerCameraRig(this.traveler.position, this.traveler.rotation.y);
    this.followTraveler = true;
    this.manuallyExploring = false;
    this.yaw = travelerRig.yaw;
    this.pitch = travelerRig.pitch;
    this.distance = travelerRig.distance;
    this.cameraTarget.set(travelerRig.target.x, travelerRig.target.y, travelerRig.target.z);
    this.updateCamera();
  }

  locateNextNpc(): QuestNpc | null {
    this.inspectingTimber = false;
    this.locatedNpcIndex = getNextNpcIndex(this.locatedNpcIndex, questNpcs.length);
    const npc = questNpcs[this.locatedNpcIndex];
    if (!npc) {
      return null;
    }

    const npcRig = getNpcCameraRig({ x: npc.x, y: 1.35, z: npc.z });
    this.followTraveler = false;
    this.manuallyExploring = false;
    this.yaw = npcRig.yaw;
    this.pitch = npcRig.pitch;
    this.distance = npcRig.distance;
    this.cameraTarget.set(npcRig.target.x, npcRig.target.y, npcRig.target.z);
    this.locatedNpcId = npc.id;
    this.updateQuestMarkerVisibility();
    this.updateCamera();
    return npc;
  }

  zoomIn(): void {
    this.distance = zoomCameraDistance(this.distance, 'in');
    this.updateCamera();
  }

  zoomOut(): void {
    this.distance = zoomCameraDistance(this.distance, 'out');
    this.updateCamera();
  }

  setPlaceLabelsVisible(visible: boolean): void {
    this.placeLabelsVisible = visible;
    this.placeLabelLayer.classList.toggle('is-visible', visible);
    if (!visible) {
      for (const element of this.placeLabelElements.values()) {
        element.classList.remove('is-visible');
      }
      return;
    }
    this.updatePlaceLabels();
  }

  setDiscovered(ids: DiscoveryId[]): void {
    this.discoveryIndicators?.setDiscovered(ids);
    for (const [id, marker] of this.markerMeshes) {
      const material = marker.material as THREE.MeshStandardMaterial;
      material.color.set(ids.includes(id) ? COLORS.markerFound : COLORS.markerLocked);
      material.emissive.set(ids.includes(id) ? 0x62430c : 0x000000);
      marker.scale.setScalar(ids.includes(id) ? 1.15 : 1);
    }
  }

  setActiveQuestEntity(id: QuestEntityId | null): void {
    if (this.activeQuestEntityId !== id) this.currentNearbyQuestEntity = null;
    this.activeQuestEntityId = id;
    this.updateQuestMarkerVisibility();
  }

  private updateQuestMarkerVisibility(): void {
    for (const [markerId, marker] of this.questMarkerGroups) {
      marker.visible = markerId === this.activeQuestEntityId || markerId === this.locatedNpcId;
      marker.scale.setScalar(markerId === this.locatedNpcId ? 1.25 : 1);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.discoveryIndicators?.dispose();
    this.pilot?.dispose();
    this.cityRealism?.dispose();
    this.cityLeaf?.dispose();
    if (this.pilotTextures) Object.values(this.pilotTextures).forEach(texture => texture.dispose());
    this.pilotLight?.shadow.dispose();
    this.pilotComposer?.passes.forEach(pass => pass.dispose());
    this.pilotComposer?.dispose();
    this.pathAbort?.abort();
    this.pathTracing?.dispose();
    this.pilotHdr?.dispose();
    this.pilotEnvironment?.dispose();
    this.pilotPoolReflection?.dispose();
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.placeLabelLayer.remove();
  }

  private addPlaceLabelLayer(): void {
    this.placeLabelLayer.className = 'place-label-layer';
    this.placeLabelLayer.setAttribute('aria-hidden', 'true');
    for (const label of this.placeLabels) {
      const element = document.createElement('span');
      element.className = `place-label place-label--${label.kind}`;
      element.dataset.labelId = label.id;
      element.dataset.kind = label.kind;
      element.innerHTML = `<i>${this.getPlaceLabelIcon(label.kind)}</i><span>${label.label}</span>`;
      this.placeLabelLayer.append(element);
      this.placeLabelElements.set(label.id, element);
    }
    this.container.append(this.placeLabelLayer);
  }

  private getPlaceLabelIcon(kind: MapLabelKind): string {
    const icons: Record<MapLabelKind, string> = {
      district: '坊',
      avenue: '道',
      palace: '宫',
      gate: '门',
      npc: '人',
      treasure: '宝',
      discovery: '考'
    };
    return icons[kind];
  }

  private buildScene(): void {
    this.addLights();
    this.worldRoot.add(this.createBoard());
    this.worldRoot.add(createFullCitySet(this.materials, changanCity));
    this.worldRoot.add(this.walkPlane);
    this.addRoads();
    this.addAvenues();
    this.addWalls();
    this.addBuildings();
    this.addImperialPrecincts();
    this.addMarketDetails();
    this.addLandmarks();
    this.addQuestMarkers();
    this.addTraveler();
  }

  private addLights(): void {
    const ambient = new THREE.HemisphereLight(0xffead0, 0x21150f, 1.45);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffd7a0, 4.2);
    key.position.set(30, 160, 80);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -360;
    key.shadow.camera.right = 560;
    key.shadow.camera.top = 420;
    key.shadow.camera.bottom = -420;
    key.shadow.camera.far = 900;
    this.scene.add(key);

    const fill = new THREE.PointLight(0xb56f42, 105, 150);
    fill.position.set(32, 40, -42);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x8ba8b1, 1.15);
    rim.position.set(55, 34, 48);
    this.scene.add(rim);
  }

  private createBoard(): THREE.Group {
    const group = new THREE.Group();
    const layout = getWorldSurfaceLayout(westMarketWorld.bounds);
    for (const segment of layout.boardSegments) {
      const boardGeometry = new THREE.BoxGeometry(segment.width, 3, segment.depth);
      const board = new THREE.Mesh(boardGeometry, this.materials.earth);
      board.position.set(segment.x, -1.7, segment.z);
      board.receiveShadow = true;
      board.castShadow = true;
      group.add(board);

      const bevelGeometry = new THREE.BoxGeometry(segment.width + 4, 2.8, segment.depth + 4);
      const bevel = new THREE.Mesh(bevelGeometry, this.materials.woodDark);
      bevel.position.set(segment.x, -3.2, segment.z);
      bevel.receiveShadow = true;
      bevel.castShadow = true;
      group.add(bevel);
    }

    return group;
  }

  private createWalkPlane(): THREE.Mesh {
    const layout = getWorldSurfaceLayout(westMarketWorld.bounds);
    const geometry = new THREE.PlaneGeometry(layout.walkPlane.width, layout.walkPlane.depth);
    const material = this.materials.earth.clone();
    material.transparent = true;
    material.opacity = 0.08;
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(layout.center.x, 0.03, layout.center.z);
    plane.name = 'walk-plane';
    return plane;
  }

  private addRoads(): void {
    for (const edge of westMarketWorld.roadEdges) {
      const from = westMarketWorld.roadNodes.find((node) => node.id === edge.from);
      const to = westMarketWorld.roadNodes.find((node) => node.id === edge.to);
      if (!from || !to) {
        continue;
      }

      const length = Math.sqrt((from.x - to.x) ** 2 + (from.z - to.z) ** 2);
      const isHorizontal = from.z === to.z;
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(isHorizontal ? length + 4 : 4.2, 0.18, isHorizontal ? 4.2 : length + 4),
        this.materials.packedEarth
      );
      road.position.set((from.x + to.x) / 2, 0.08, (from.z + to.z) / 2);
      road.receiveShadow = true;
      this.worldRoot.add(road);

      const borderLength = isHorizontal ? length + 4 : length + 4;
      for (const side of [-1, 1]) {
        const border = new THREE.Mesh(
          new THREE.BoxGeometry(isHorizontal ? borderLength : 0.18, 0.12, isHorizontal ? 0.18 : borderLength),
          this.materials.stone
        );
        border.position.set(
          (from.x + to.x) / 2 + (isHorizontal ? 0 : side * 2.2),
          0.16,
          (from.z + to.z) / 2 + (isHorizontal ? side * 2.2 : 0)
        );
        border.receiveShadow = true;
        this.worldRoot.add(border);
      }
    }
  }

  private addAvenues(): void {
    for (const avenue of createAvenueSurfaceSpecs(westMarketWorld.avenues)) {
      const boulevard = new THREE.Mesh(
        new THREE.BoxGeometry(avenue.width, 0.24, avenue.depth),
        this.materials.packedEarth
      );
      boulevard.name = `${avenue.id}-surface`;
      boulevard.position.set(avenue.x, 0.13, avenue.z);
      boulevard.receiveShadow = true;
      this.worldRoot.add(boulevard);

      const centerStrip = new THREE.Mesh(
        new THREE.BoxGeometry(avenue.centerStrip.width, 0.06, avenue.centerStrip.depth),
        this.materials.earth
      );
      centerStrip.name = `${avenue.id}-center-strip`;
      centerStrip.position.set(avenue.centerStrip.x, 0.28, avenue.centerStrip.z);
      centerStrip.receiveShadow = true;
      this.worldRoot.add(centerStrip);

      for (const [index, channelSpec] of avenue.drainageChannels.entries()) {
        const channel = new THREE.Mesh(
          new THREE.BoxGeometry(channelSpec.width, 0.12, channelSpec.depth),
          this.materials.stone
        );
        channel.name = `${avenue.id}-drainage-${index + 1}`;
        channel.position.set(channelSpec.x, 0.27, channelSpec.z);
        channel.receiveShadow = true;
        this.worldRoot.add(channel);
      }

      for (const [index, curbSpec] of avenue.curbs.entries()) {
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(curbSpec.width, 0.42, curbSpec.depth),
          this.materials.stone
        );
        curb.name = `${avenue.id}-curb-${index + 1}`;
        curb.position.set(curbSpec.x, 0.32, curbSpec.z);
        curb.castShadow = true;
        curb.receiveShadow = true;
        this.worldRoot.add(curb);
      }
    }
  }

  private addWalls(): void {
    const wallGroup=new THREE.Group();wallGroup.name='batched-static-walls';
    for (const wall of westMarketWorld.walls) {
      if (changanCity.outerWalls.includes(wall)) continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.width, wall.height, wall.depth), this.materials.earth);
      mesh.position.set(wall.x, wall.height / 2, wall.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallGroup.add(mesh);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(wall.width + (wall.width > wall.depth ? 0.2 : 0.45), 0.22, wall.depth + (wall.depth > wall.width ? 0.2 : 0.45)),
        this.materials.roofTile
      );
      cap.position.set(wall.x, wall.height + 0.1, wall.z);
      cap.castShadow = true;
      wallGroup.add(cap);

      const segmentLength = Math.max(wall.width, wall.depth);
      const merlonCount = Math.max(2, Math.floor(segmentLength / 4));
      for (let merlonIndex = 0; merlonIndex < merlonCount; merlonIndex += 1) {
        const t = merlonCount === 1 ? 0.5 : merlonIndex / (merlonCount - 1);
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.55, 0.72), this.materials.earth);
        merlon.position.set(
          wall.width > wall.depth ? THREE.MathUtils.lerp(wall.x - wall.width / 2 + 0.8, wall.x + wall.width / 2 - 0.8, t) : wall.x,
          wall.height + 0.48,
          wall.depth > wall.width ? THREE.MathUtils.lerp(wall.z - wall.depth / 2 + 0.8, wall.z + wall.depth / 2 - 0.8, t) : wall.z
        );
        merlon.castShadow = true;
        wallGroup.add(merlon);
      }
    }
    batchStaticArchitecture(wallGroup);this.worldRoot.add(wallGroup);

    const gate = createMarketGate(this.materials);
    gate.position.set(-39, 0, 0);
    this.worldRoot.add(gate);
  }

  private addBuildings(): void {
    westMarketWorld.buildings.forEach((block, index) => {
      const building=createTangBuilding(block,this.materials,index);
      batchStaticArchitecture(building);this.worldRoot.add(building);
    });

    for (const courtyard of [
      { x: -27, z: -18 },
      { x: -11, z: 8 },
      { x: 10, z: -19 },
      { x: 27, z: 8 }
    ]) {
      const paving = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.14, 8.5), this.materials.stone);
      paving.position.set(courtyard.x, 0.13, courtyard.z);
      paving.receiveShadow = true;
      this.worldRoot.add(paving);
    }
  }

  private addImperialPrecincts(): void {
    this.worldRoot.add(createImperialPrecinctSet(this.materials, westMarketWorld.imperialPrecincts));
  }

  private addMarketDetails(): void {
    this.worldRoot.add(createMarketDetailSet(this.materials, westMarketWorld.detailAnchors));
  }

  private addLandmarks(): void {
    for (const landmark of westMarketWorld.landmarks) {
      const marker = this.createLandmarkMarker(landmark);
      this.markerMeshes.set(landmark.discoveryId, marker);
      this.worldRoot.add(marker);
    }
  }

  private createLandmarkMarker(landmark: Landmark): THREE.Mesh {
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.6, 0),
      new THREE.MeshStandardMaterial({ color: COLORS.markerLocked, roughness: 0.42, emissive: 0x000000 })
    );
    marker.position.set(landmark.position.x, 4.4, landmark.position.z);
    marker.castShadow = true;
    return marker;
  }

  private addQuestMarkers(): void {
    const group = new THREE.Group();
    group.name = 'quest-interaction-markers';
    for (const marker of this.questMarkers) {
      const markerGroup = this.createQuestMarker(marker);
      markerGroup.visible = false;
      this.questMarkerGroups.set(marker.id, markerGroup);
      group.add(markerGroup);
    }
    this.worldRoot.add(group);
  }

  private createQuestMarker(spec: QuestMarkerSpec): THREE.Group {
    const marker = new THREE.Group();
    marker.name = `quest-marker-${spec.id}`;
    marker.position.set(spec.x, 0, spec.z);

    if (spec.kind === 'npc') {
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.72, 1.55, 3, 8),
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.62, emissive: 0x102826 })
      );
      body.position.y = 1.35;
      body.castShadow = true;
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.05, 6, 28),
        new THREE.MeshStandardMaterial({ color: 0xcff1de, roughness: 0.5, emissive: 0x1c6b57 })
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.12;
      marker.add(body, halo);
      return marker;
    }

    const clue = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.15, 0),
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.36, emissive: 0x6f4310 })
    );
    clue.position.y = 1.65;
    clue.castShadow = true;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.32, 1.9), this.materials.stone);
    plinth.position.y = 0.26;
    plinth.receiveShadow = true;
    marker.add(clue, plinth);
    return marker;
  }

  private addTraveler(): void {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.82, 1.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: COLORS.traveler, roughness: 0.58 })
    );
    body.position.y = 1.55;
    body.castShadow = true;
    this.traveler.add(body);

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(1.15, 0.55, 24),
      new THREE.MeshStandardMaterial({ color: COLORS.travelerDark, roughness: 0.7 })
    );
    hat.position.y = 2.9;
    hat.castShadow = true;
    this.traveler.add(hat);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.85, 36),
      this.travelerRingMaterial
    );
    ring.name = 'traveler-phase-ring';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    this.traveler.add(ring);

    this.traveler.position.copy(this.targetPosition);
    this.worldRoot.add(this.traveler);
  }

  private attachEvents(): void {
    window.addEventListener('resize', this.resize);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  private readonly resize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.pilotComposer?.setSize(width,height);
    this.pilotAo?.setSize(Math.floor(width*.5),Math.floor(height*.5));
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.isDragging = true;
    this.isPanning = event.button === 2 || event.shiftKey;
    this.dragDistance = 0;
    this.lastPointer = { x: event.clientX, y: event.clientY };
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.dragDistance += Math.abs(dx) + Math.abs(dy);
    this.lastPointer = { x: event.clientX, y: event.clientY };
    if (this.dragDistance > 5) {
      this.manuallyExploring = true;
      this.followTraveler = false;
    }
    if (this.isPanning) {
      const nextTarget = panCameraTarget(this.cameraTarget, dx, dy, this.yaw, this.distance);
      this.cameraTarget.set(nextTarget.x, nextTarget.y, nextTarget.z);
    } else {
      this.yaw -= dx * 0.006;
      this.pitch = this.inspectingTimber ? THREE.MathUtils.clamp(this.pitch + dy * .004, 0, 1.28) : clampCameraPitch(this.pitch + dy * 0.004);
    }
    this.updateCamera();
  };

  private readonly handlePointerUp = (): void => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.distance = clampCameraDistance(this.distance + event.deltaY * 0.06);
    const target=zoomCameraTarget(this.cameraTarget,{x:this.traveler.position.x,y:1.2,z:this.traveler.position.z},this.distance,this.followTraveler);
    this.cameraTarget.set(target.x,target.y,target.z);
    this.updateCamera();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) {
      return;
    }
    if (event.code === 'Space') {
      if (!event.repeat) {
        this.setPhaseThroughActive(!this.phaseThroughActive);
      }
      event.preventDefault();
      return;
    }
    if (!this.keyboardMoveState.setKey(event.code, true)) {
      return;
    }
    event.preventDefault();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
      return;
    }
    if (!this.keyboardMoveState.setKey(event.code, false)) {
      return;
    }
    event.preventDefault();
  };

  private readonly handleWindowBlur = (): void => {
    this.keyboardMoveState.clear();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    if (this.dragDistance > 5) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const [hit] = this.raycaster.intersectObject(this.walkPlane);
    if (!hit) {
      return;
    }

    const path = this.cityNavigation.findRoute(
      { x: this.traveler.position.x, z: this.traveler.position.z },
      { x: hit.point.x, z: hit.point.z }, 4
    );
    if (!path?.length) {
      this.container.dispatchEvent(new CustomEvent('city-route-unavailable'));
      return;
    }

    this.route = path;
    this.routeIndex = path.length > 1 ? 1 : 0;
    this.advanceRouteTarget();
    this.checkDiscovery();
    this.checkQuestInteraction();
  };

  private updateCamera(): void {
    const x = this.cameraTarget.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const z = this.cameraTarget.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    const y = this.cameraTarget.y + Math.sin(this.pitch) * this.distance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private updatePlaceLabels(): void {
    if (!this.placeLabelsVisible) {
      return;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    const occupied: LabelRect[] = [];
    const sortedLabels = [...this.placeLabels].sort((a, b) => b.priority - a.priority);
    for (const label of sortedLabels) {
      const element = this.placeLabelElements.get(label.id);
      if (!element) {
        continue;
      }

      this.labelWorldPosition.set(label.x, label.y, label.z);
      const distance = this.camera.position.distanceTo(this.labelWorldPosition);
      this.labelProjectedPosition.copy(this.labelWorldPosition).project(this.camera);
      const isInFront = this.labelProjectedPosition.z >= -1 && this.labelProjectedPosition.z <= 1;
      const visible = getLabelVisibility({
        distance,
        minDistance: label.minDistance,
        maxDistance: label.maxDistance,
        isInFront
      }) === 'visible';
      const screenX = (this.labelProjectedPosition.x * 0.5 + 0.5) * width;
      const screenY = (-this.labelProjectedPosition.y * 0.5 + 0.5) * height;
      const estimatedWidth = Math.max(72, label.label.length * 15 + 36);
      const rect = { x: screenX - estimatedWidth / 2, y: screenY - 15, width: estimatedWidth, height: 30 };
      const overlaps = occupied.some((item) => rectanglesOverlap(rect, item));

      if (!visible || screenX < -80 || screenX > width + 80 || screenY < -50 || screenY > height + 50 || overlaps) {
        element.classList.remove('is-visible');
        continue;
      }

      occupied.push(rect);
      const scale = Math.max(0.78, Math.min(1.08, 1.18 - distance / 820));
      element.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%) scale(${scale})`;
      element.classList.add('is-visible');
    }
  }

  private animate = (): void => {
    const delta = this.clock.getDelta();
    this.updateTraveler(delta);
    this.updateCameraFollow(delta);
    this.updatePlaceLabels();
    this.discoveryIndicators?.update(this.camera);
    if(this.pilotEnabled){
      this.traveler.updateWorldMatrix(true,false);
      if(this.shadowRefresh.update(this.camera.matrixWorld,this.traveler.matrixWorld,performance.now())) { this.updateCityLighting(); this.renderer.shadowMap.needsUpdate=true; }
    }
    const traced=this.pilotEnabled&&this.pathTracingEnabled&&this.pathTracing?.render();
    if(this.pathTracing?.failed){
      this.pathTracingEnabled=false;this.pathTracing=undefined;
      this.container.dispatchEvent(new CustomEvent("path-tracing-failed"));
    }
    if(!traced){
      if (this.pilotEnabled && this.pilotComposer) this.pilotComposer.render();
      else this.renderer.render(this.scene, this.camera);
    }
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private updateCameraFollow(delta: number): void {
    if (!shouldFollowTraveler({ manuallyExploring: this.manuallyExploring, followTraveler: this.followTraveler })) {
      return;
    }

    const blend = 1 - Math.exp(-delta * 2.6);
    const nextTarget = updateFollowTarget(
      this.cameraTarget,
      getTravelerCameraRig(this.traveler.position, this.traveler.rotation.y).target,
      blend
    );
    const travelerRig = getTravelerCameraRig(this.traveler.position, this.traveler.rotation.y);
    this.cameraTarget.set(nextTarget.x, nextTarget.y, nextTarget.z);
    this.yaw += (travelerRig.yaw - this.yaw) * Math.min(1, blend * 1.2);
    this.pitch += (travelerRig.pitch - this.pitch) * Math.min(1, blend * 1.2);
    this.distance += (travelerRig.distance - this.distance) * Math.min(1, blend * 1.2);
    this.updateCamera();
  }

  private updateTraveler(delta: number): void {
    if (this.updateKeyboardTraveler(delta)) {
      return;
    }

    const direction = new THREE.Vector3().subVectors(this.targetPosition, this.traveler.position);
    const distance = direction.length();
    if (distance > 0.05) {
      const step = Math.min(distance, delta * 11);
      direction.normalize();
      const desired = {
        x: this.traveler.position.x + direction.x * step,
        z: this.traveler.position.z + direction.z * step
      };
      const nextPosition = resolveCollision(
        { x: this.traveler.position.x, z: this.traveler.position.z },
        desired,
        this.movementObstacles,
        this.phaseThroughActive
      );
      const moved = Math.hypot(nextPosition.x - this.traveler.position.x, nextPosition.z - this.traveler.position.z) > 0.0001;
      if (!moved) {
        return;
      }
      this.traveler.position.set(nextPosition.x, 0.9, nextPosition.z);
      this.traveler.rotation.y = Math.atan2(direction.x, direction.z);
      this.checkDiscovery();
      this.checkQuestInteraction();
      this.onMove?.({ x: this.traveler.position.x, z: this.traveler.position.z });
      return;
    }

    if (this.route.length > 0 && this.routeIndex < this.route.length - 1) {
      this.routeIndex += 1;
      this.advanceRouteTarget();
    } else if (this.route.length > 0) {
      this.route = [];
    }
  }

  private updateKeyboardTraveler(delta: number): boolean {
    const intent = getKeyboardMoveIntent(this.keyboardMoveState);
    if (!intent.active) {
      return false;
    }

    const nextPose = moveWithRoadSnap(
      {
        x: this.traveler.position.x,
        z: this.traveler.position.z,
        heading: this.traveler.rotation.y
      },
      intent,
      delta,
      westMarketWorld.roadNodes,
      westMarketWorld.roadEdges,
      this.movementObstacles,
      this.phaseThroughActive
    );

    this.route = [];
    this.routeIndex = 0;
    this.followTraveler = true;
    this.manuallyExploring = false;
    this.traveler.position.set(nextPose.x, 0.9, nextPose.z);
    this.traveler.rotation.y = nextPose.heading;
    this.targetPosition = new THREE.Vector3(nextPose.x, 0.9, nextPose.z);
    this.checkDiscovery();
    this.checkQuestInteraction();
    this.onMove?.({ x: nextPose.x, z: nextPose.z });
    return true;
  }

  private setPhaseThroughActive(active: boolean): void {
    if (active === this.phaseThroughActive) {
      return;
    }

    this.phaseThroughActive = active;
    this.travelerRingMaterial.color.set(active ? 0x86e5da : 0xf1c87a);
    this.travelerRingMaterial.opacity = active ? 0.9 : 0.58;
    const ring = this.traveler.getObjectByName('traveler-phase-ring');
    ring?.scale.setScalar(active ? 1.32 : 1);
  }

  private advanceRouteTarget(): void {
    const node = this.route[this.routeIndex];
    if (!node) {
      return;
    }
    this.targetPosition = new THREE.Vector3(node.x, 0.9, node.z);
  }

  private checkDiscovery(): void {
    const landmark = findTriggeredDiscovery(
      { x: this.traveler.position.x, z: this.traveler.position.z },
      westMarketWorld.landmarks
    );
    if (!landmark) {
      this.currentNearbyDiscovery = null;
      return;
    }
    if (this.currentNearbyDiscovery === landmark.discoveryId) {
      return;
    }

    this.currentNearbyDiscovery = landmark.discoveryId;
    this.onDiscovery(landmark.discoveryId);
  }

  private checkQuestInteraction(): void {
    const x = this.traveler.position.x;
    const z = this.traveler.position.z;
    const nearby = findNearbyQuestMarker(this.questMarkers, {x, z}, this.activeQuestEntityId);
    if (!nearby) {
      this.currentNearbyQuestEntity = null;
      return;
    }
    if (this.currentNearbyQuestEntity === nearby.id) {
      return;
    }

    this.currentNearbyQuestEntity = nearby.id;
    this.onQuestInteraction?.(nearby.id);
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName);
}

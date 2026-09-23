import './styles.css';
import { discoveryById, type DiscoveryId } from './data/discoveries';
import { questEntityById, treasureById, type QuestEntityId } from './data/quests';
import { createDiscoveryState } from './discoveries/state';
import { createQuestState } from './quests/state';
import { WestMarketScene } from './scene/WestMarketScene';
import { createCityTourUi } from './ui/cityTourUi';
import { cityDestinations } from './data/cityDestinations';
import { createAppUi } from './ui/appUi';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app mount point');
}

const discoveryState = createDiscoveryState(window.localStorage);
const questState = createQuestState(window.localStorage);
let scene: WestMarketScene | undefined;

function syncQuestUi(): void {
  const currentObjective = questState.getCurrentObjective();
  ui.setQuestProgress({
    progress: questState.getProgress(),
    currentChapter: questState.getCurrentChapter(),
    currentObjective
  });
  scene?.setActiveQuestEntity(currentObjective?.entityId ?? null);
}

const ui = createAppUi({
  root: app,
  onResetView: () => scene?.resetView(),
  onLocateTraveler: () => scene?.locateTraveler(),
  onLocateNpc: () => {
    const npc = scene?.locateNextNpc();
    if (npc) {
      ui.showQuestToast(npc.name, npc.role);
    }
  },
  onTogglePlaceLabels: (visible: boolean) => scene?.setPlaceLabelsVisible(visible),
  onZoomIn: () => scene?.zoomIn(),
  onZoomOut: () => scene?.zoomOut(),
  onClearProgress: () => {
    discoveryState.reset();
    questState.reset();
    scene?.setDiscovered([]);
    syncQuestUi();
  }
});

const sceneContainer = app.querySelector<HTMLElement>('#scene-container');
if (!sceneContainer) {
  throw new Error('Missing scene container');
}

scene = new WestMarketScene({
  container: sceneContainer,
  onDiscovery: (id: DiscoveryId) => {
    const isNew = discoveryState.discover(id);
    const discoveredIds = discoveryState.getDiscoveredIds();
    const discovery = discoveryById.get(id);
    ui.setDiscovered(discoveredIds);
    ui.openDiscovery(id);
    scene?.setDiscovered(discoveredIds);
    if (discovery) {
      ui.showDiscoveryToast(discovery, isNew);
    }
  },
  onQuestInteraction: (id: QuestEntityId) => {
    const entity = questEntityById.get(id);
    if (!entity) {
      return;
    }

    const knownBefore = entity.kind === 'npc' && questState.getProgress().knowledgeIds.includes(entity.knowledge.id);
    const result = questState.interact(id);
    if (entity.kind === 'npc' && (result.accepted || knownBefore)) {
      ui.showNpcDialogue(entity, result.accepted && !knownBefore);
    } else if (entity.kind === 'npc' && !result.accepted) {
      ui.showQuestToast(entity.name, '先完成当前任务，再来与他交谈');
    }
    if (!result.accepted) {
      return;
    }

    syncQuestUi();
    if (result.collectedTreasureId) {
      const treasure = treasureById.get(result.collectedTreasureId);
      ui.showQuestToast(treasure?.name ?? '获得历史线索', result.gameCompleted ? '长安寻宝完成' : '线索已收入背包');
    } else if (result.chapterCompletedId) {
      ui.showQuestToast('新章节已解锁', '继续沿任务提示探索长安');
    }
  },
  onMove: ui.setTravelerPosition
});

const initialDiscoveredIds = discoveryState.getDiscoveredIds();
ui.setDiscovered(initialDiscoveredIds);
scene.setDiscovered(initialDiscoveredIds);
syncQuestUi();


// Camera tours leave traveler and saved progress untouched.
createCityTourUi(sceneContainer, destination => scene?.focusDestination(destination));
const pilotPanel = document.createElement('div');
pilotPanel.className = 'taiji-pilot-panel';
pilotPanel.innerHTML = `<span class="taiji-pilot-label">长安全城 · 写实漫游</span><details class="palace-detail-controls"><summary>太极宫细看</summary><button type="button" data-pilot-focus>回到主殿</button><button type="button" data-pilot-detail>近看建筑</button><button type="button" data-pilot-oblique>庭院斜俯视</button><button type="button" data-pilot-trees>庭院植被</button><button type="button" data-pilot-timber>檐下细节</button></details><button type="button" data-pilot-toggle disabled aria-pressed="true">材质加载中…</button><button type="button" data-path-toggle disabled aria-pressed="false">静观光照</button><small data-pilot-status>选择片区巡览 · 拖动旋转 / 滚轮缩放</small>`;
sceneContainer.append(pilotPanel);
pilotPanel.querySelector('[data-pilot-focus]')!.addEventListener('click', () => scene?.focusTaiji());
pilotPanel.querySelector('[data-pilot-detail]')!.addEventListener('click', () => scene?.focusTaijiDetail());
pilotPanel.querySelector('[data-pilot-oblique]')!.addEventListener('click', () => scene?.focusTaijiOblique());
pilotPanel.querySelector('[data-pilot-timber]')!.addEventListener('click', () => scene?.focusTaijiTimber());
pilotPanel.querySelector('[data-pilot-trees]')!.addEventListener('click',()=>scene?.focusTaijiTrees());
const pilotToggle = pilotPanel.querySelector<HTMLButtonElement>('[data-pilot-toggle]')!;
let pilotEnabled = true;
let pathEnabled=false;
let pathPreparing=false;
const pathToggle=pilotPanel.querySelector<HTMLButtonElement>('[data-path-toggle]')!;
const pathStatus=pilotPanel.querySelector<HTMLElement>('[data-pilot-status]')!;
pathToggle.addEventListener('click',async()=>{
  pathToggle.disabled=true;pathPreparing=true;
  pathEnabled=await scene!.setPathTracingEnabled(!pathEnabled,message=>{pathStatus.textContent=message;});
  pathPreparing=false;
  pathToggle.textContent=pathEnabled?'实时光照':'静观光照';
  if(!pathEnabled&&!pathStatus.textContent?.includes('未启用'))pathStatus.textContent='实时光照 · 拖动旋转 / 滚轮缩放';
  pathToggle.setAttribute('aria-pressed',String(pathEnabled));
  pathToggle.disabled=!pilotEnabled||pathPreparing;
});
sceneContainer.addEventListener('path-tracing-failed',()=>{
  pathEnabled=false;pathToggle.textContent='静观光照';pathToggle.setAttribute('aria-pressed','false');
});
pilotToggle.addEventListener('click', () => {
  pilotEnabled = !pilotEnabled;
  scene?.setTaijiPilotEnabled(pilotEnabled);
  pathEnabled=false;pathToggle.textContent="静观光照";pathToggle.setAttribute("aria-pressed","false");pathToggle.disabled=!pilotEnabled||pathPreparing;
  pilotToggle.setAttribute('aria-pressed', String(pilotEnabled));
  pilotToggle.textContent = pilotEnabled ? '查看原始效果' : '查看写实场景';
});
scene.focusDestination(cityDestinations[0]);
void scene.prepareTaijiPilot().then(() => {
  pilotToggle.disabled = false;
  pilotToggle.textContent = '查看原始效果';
  pilotPanel.dataset.ready = 'true';
  pathToggle.disabled=false;
}).catch(error => {
  scene?.setTaijiPilotEnabled(false);pilotEnabled=false;
  console.error('Taiji material loading failed', error);
  pilotToggle.textContent = '材质加载失败';
  pilotPanel.querySelector('[data-pilot-status]')!.textContent = '请刷新重试；当前显示原场景';
});

sceneContainer.addEventListener('city-view-changed', () => { pathEnabled=false; pathToggle.textContent='静观光照'; pathToggle.setAttribute('aria-pressed','false'); pathStatus.textContent='选择片区巡览 · 拖动旋转 / 滚轮缩放'; });
sceneContainer.addEventListener('city-route-unavailable', () => ui.showQuestToast('这里暂不可到达', '请点击附近的道路或院门'));

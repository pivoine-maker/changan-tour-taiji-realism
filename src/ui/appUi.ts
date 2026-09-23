import { changanCity } from '../data/changanCity';
import { imperialPrecincts } from '../data/imperialCity';
import { westMarketWorld } from '../data/world';
import { discoveries, discoveryById, type DiscoveryCard, type DiscoveryId } from '../data/discoveries';
import {
  knowledgeById,
  questChapters,
  questNpcs,
  treasureById,
  type QuestChapter,
  type QuestNpc,
  type QuestObjective
} from '../data/quests';
import type { Point2 } from '../data/world';
import type { QuestProgress } from '../quests/state';

interface AppUiOptions {
  root: HTMLElement;
  onResetView: () => void;
  onLocateTraveler: () => void;
  onLocateNpc: () => void;
  onTogglePlaceLabels: (visible: boolean) => void;
  onClearProgress: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export interface AppUi {
  setDiscovered: (ids: DiscoveryId[]) => void;
  openDiscovery: (id: DiscoveryId) => void;
  showDiscoveryToast: (card: DiscoveryCard, isNew: boolean) => void;
  setTravelerPosition: (position: Point2) => void;
  setQuestProgress: (view: QuestProgressView) => void;
  showNpcDialogue: (npc: QuestNpc, isNewKnowledge: boolean) => void;
  showQuestToast: (title: string, subtitle: string) => void;
}

export interface QuestProgressView {
  progress: QuestProgress;
  currentChapter: QuestChapter | null;
  currentObjective: QuestObjective | null;
}

export function createAppUi(options: AppUiOptions): AppUi {
  options.root.innerHTML = `
    <div class="game-shell">
      <header class="topbar">
        <div class="brand-block">
          <div>
            <p class="overline">公元 750 年 · 唐长安</p>
            <h1>天宝长安 <span>全城漫游</span></h1>
          </div>
        </div>
        <div class="topbar-status">
          <div class="era-chip"><span class="status-dot"></span>解释性历史复原</div>
          <div class="progress-copy"><strong id="progress-count">0 / ${discoveries.length}</strong><span>考古发现</span></div>
          <button class="find-traveler-button" id="locate-traveler" type="button" aria-label="一键找到旅人"><span>◎</span>找到旅人</button>
          <button class="find-traveler-button" id="locate-npc" type="button" aria-label="循环找到 NPC"><span>◇</span>找到 NPC</button>
          <button class="find-traveler-button place-label-toggle" id="toggle-place-labels" type="button" aria-label="显示或隐藏地名" aria-pressed="false"><span>名</span>显示地名</button>
          <button class="icon-button" id="reset-view" type="button" aria-label="重置视角">↺</button>
        </div>
      </header>

      <main class="game-stage">
        <section class="scene-panel" aria-label="唐长安全城三维沙盘">
          <div id="scene-container" class="scene-container"></div>
          <div class="scene-vignette" aria-hidden="true"></div>
          <div class="location-plate">
            <span class="location-pin">◆</span>
            <div><small>当前区域</small><strong>长安全城</strong></div>
          </div>
          <div class="position-readout" aria-live="polite">
            <span>旅人方位</span><strong id="position-text">西门 · 起点</strong>
          </div>
          <div class="zoom-controls" aria-label="缩放控制">
            <button id="zoom-in" type="button" aria-label="拉近视角">+</button>
            <button id="zoom-out" type="button" aria-label="拉远视角">−</button>
          </div>
          <div class="phase-mode-hint" id="phase-mode-hint" role="note" aria-label="按空格键切换穿越障碍模式">
            <i>空格键</i>
            <span><strong>穿越障碍模式</strong><small>按一下即可开启或关闭</small></span>
          </div>
          <div class="controls-hint" id="controls-hint">
            <span><i>WASD</i> 行走转向</span>
            <span><i>拖</i> 旋转沙盘</span>
            <span><i>⇧拖</i> 平移街区</span>
            <span><i>滚</i> 拉近视角</span>
            <span><i>点</i> 沿街行走</span>
          </div>
          <div class="discovery-toast" id="discovery-toast" role="status" aria-live="polite"></div>
          <article class="npc-dialogue" id="npc-dialogue" aria-live="polite"></article>
        </section>

        <aside class="archive-panel" id="archive-panel" aria-label="长安探索档案栏">
          <button class="archive-collapse-button" id="toggle-archive-panel" type="button" aria-controls="archive-panel-body" aria-expanded="true" aria-label="收起右侧档案栏">
            <span class="archive-collapse-icon" aria-hidden="true">›</span>
            <span class="archive-collapse-text">收起档案栏</span>
          </button>
          <div class="archive-panel-body" id="archive-panel-body" aria-hidden="false">
            <div class="archive-header">
              <div>
                <p class="overline">FIELD ARCHIVE · 实地档案</p>
                <h2>长安探索</h2>
              </div>
              <button class="text-button" id="clear-progress" type="button">清除记录</button>
            </div>
            <div class="archive-tabs" role="tablist" aria-label="右侧内容切换">
              <button class="archive-tab is-active" id="tab-quest" type="button" role="tab" aria-controls="quest-view" aria-selected="true">寻宝任务</button>
              <button class="archive-tab" id="tab-archive" type="button" role="tab" aria-controls="archive-view" aria-selected="false">考古发现</button>
            </div>
            <section class="sidebar-view is-active" id="quest-view" role="tabpanel" aria-labelledby="tab-quest">
              <aside class="quest-panel" aria-label="当前寻宝任务">
                <p class="overline">QUEST · 长安寻宝</p>
                <h2 id="quest-title">等待任务</h2>
                <p id="quest-subtitle">靠近 NPC 或发光线索推进章节。</p>
                <div class="quest-objective"><span>当前目标</span><strong id="quest-objective">从西门进入长安</strong><small id="quest-instruction">沿街探索，寻找第一位引路人。</small></div>
                <div class="quest-meter"><span id="quest-meter-bar"></span></div>
                <section class="clue-bag" aria-label="线索背包"><h3>线索背包</h3><div id="clue-list"></div></section>
              </aside>
            </section>
            <section class="sidebar-view" id="archive-view" role="tabpanel" aria-labelledby="tab-archive" hidden>
              <div class="archive-progress"><span id="progress-bar"></span></div>
              <div class="discovery-list" id="discovery-list"></div>
              <article class="archive-card" id="archive-card"></article>
            </section>
            <footer class="archive-footer">
              <span>史料、考古与空间推演共同构成</span>
              <span>Prototype · 2026</span>
            </footer>
          </div>
        </aside>
      </main>
    </div>
  `;

  const resetViewButton = requireElement<HTMLButtonElement>(options.root, '#reset-view');
  const locateTravelerButton = requireElement<HTMLButtonElement>(options.root, '#locate-traveler');
  const locateNpcButton = requireElement<HTMLButtonElement>(options.root, '#locate-npc');
  const placeLabelsButton = requireElement<HTMLButtonElement>(options.root, '#toggle-place-labels');
  const zoomInButton = requireElement<HTMLButtonElement>(options.root, '#zoom-in');
  const zoomOutButton = requireElement<HTMLButtonElement>(options.root, '#zoom-out');
  const gameStage = requireElement<HTMLElement>(options.root, '.game-stage');
  const archivePanel = requireElement<HTMLElement>(options.root, '#archive-panel');
  const archivePanelBody = requireElement<HTMLElement>(options.root, '#archive-panel-body');
  const archiveToggleButton = requireElement<HTMLButtonElement>(options.root, '#toggle-archive-panel');
  const clearProgressButton = requireElement<HTMLButtonElement>(options.root, '#clear-progress');
  const list = requireElement<HTMLElement>(options.root, '#discovery-list');
  const card = requireElement<HTMLElement>(options.root, '#archive-card');
  const progressCount = requireElement<HTMLElement>(options.root, '#progress-count');
  const progressBar = requireElement<HTMLElement>(options.root, '#progress-bar');
  const toast = requireElement<HTMLElement>(options.root, '#discovery-toast');
  const positionText = requireElement<HTMLElement>(options.root, '#position-text');
  const questTitle = requireElement<HTMLElement>(options.root, '#quest-title');
  const questSubtitle = requireElement<HTMLElement>(options.root, '#quest-subtitle');
  const questObjective = requireElement<HTMLElement>(options.root, '#quest-objective');
  const questInstruction = requireElement<HTMLElement>(options.root, '#quest-instruction');
  const questMeterBar = requireElement<HTMLElement>(options.root, '#quest-meter-bar');
  const clueList = requireElement<HTMLElement>(options.root, '#clue-list');
  const npcDialogue = requireElement<HTMLElement>(options.root, '#npc-dialogue');
  const tabQuest = requireElement<HTMLButtonElement>(options.root, '#tab-quest');
  const tabArchive = requireElement<HTMLButtonElement>(options.root, '#tab-archive');
  const questView = requireElement<HTMLElement>(options.root, '#quest-view');
  const archiveView = requireElement<HTMLElement>(options.root, '#archive-view');
  let discoveredIds: DiscoveryId[] = [];
  let selectedId: DiscoveryId | null = null;
  let toastTimer = 0;
  let dialogueTimer = 0;
  let layoutTimer = 0;
  let questHasProgress = false;
  let placeLabelsVisible = false;
  let archiveCollapsed = false;

  resetViewButton.addEventListener('click', options.onResetView);
  locateTravelerButton.addEventListener('click', options.onLocateTraveler);
  locateNpcButton.addEventListener('click', options.onLocateNpc);
  placeLabelsButton.addEventListener('click', () => {
    setPlaceLabelsButtonState(!placeLabelsVisible);
    options.onTogglePlaceLabels(placeLabelsVisible);
  });
  tabQuest.addEventListener('click', () => setSidebarTab('quest'));
  tabArchive.addEventListener('click', () => setSidebarTab('archive'));
  archiveToggleButton.addEventListener('click', () => setArchiveCollapsed(!archiveCollapsed));
  bindRepeatButton(zoomInButton, options.onZoomIn);
  bindRepeatButton(zoomOutButton, options.onZoomOut);
  clearProgressButton.addEventListener('click', () => {
    options.onClearProgress();
    discoveredIds = [];
    selectedId = null;
    render();
  });

  function setPlaceLabelsButtonState(visible: boolean): void {
    placeLabelsVisible = visible;
    placeLabelsButton.setAttribute('aria-pressed', String(visible));
    placeLabelsButton.innerHTML = `<span>名</span>${visible ? '隐藏地名' : '显示地名'}`;
  }

  function setArchiveCollapsed(collapsed: boolean): void {
    archiveCollapsed = collapsed;
    gameStage.classList.toggle('is-archive-collapsed', collapsed);
    archivePanel.classList.toggle('is-collapsed', collapsed);
    archivePanelBody.setAttribute('aria-hidden', String(collapsed));
    archiveToggleButton.setAttribute('aria-expanded', String(!collapsed));
    archiveToggleButton.setAttribute('aria-label', collapsed ? '展开右侧档案栏' : '收起右侧档案栏');
    archiveToggleButton.innerHTML = `
      <span class="archive-collapse-icon" aria-hidden="true">${collapsed ? '‹' : '›'}</span>
      <span class="archive-collapse-text">${collapsed ? '展开档案栏' : '收起档案栏'}</span>
    `;
    notifyLayoutChanged();
  }

  function notifyLayoutChanged(): void {
    window.clearTimeout(layoutTimer);
    window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    layoutTimer = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  }

  function render(): void {
    progressCount.textContent = `${discoveredIds.length} / ${discoveries.length}`;
    progressBar.style.width = `${(discoveredIds.length / discoveries.length) * 100}%`;
    clearProgressButton.disabled = discoveredIds.length === 0 && !questHasProgress;
    list.innerHTML = discoveries
      .map((discovery) => {
        const isFound = discoveredIds.includes(discovery.id);
        const isSelected = selectedId === discovery.id;
        return `
          <button
            class="discovery-list-item ${isFound ? 'is-found' : 'is-locked'} ${isSelected ? 'is-selected' : ''}"
            type="button"
            data-discovery-id="${discovery.id}"
            ${isFound ? '' : 'disabled'}
          >
            <span class="list-index">${isFound ? discovery.indexLabel : '·'}</span>
            <span><strong>${isFound ? discovery.title : '尚未发现'}</strong><small>${isFound ? discovery.subtitle : '沿街行走，靠近遗址'}</small></span>
            <span class="list-state">${isFound ? '阅' : '—'}</span>
          </button>
        `;
      })
      .join('');

    for (const button of list.querySelectorAll<HTMLButtonElement>('[data-discovery-id]')) {
      button.addEventListener('click', () => openDiscovery(button.dataset.discoveryId as DiscoveryId));
    }

    const selected = selectedId ? discoveryById.get(selectedId) : undefined;
    card.innerHTML = selected ? renderArchiveCard(selected) : renderArchiveIntro(discoveredIds.length);
  }

  function openDiscovery(id: DiscoveryId): void {
    if (!discoveredIds.includes(id)) {
      return;
    }
    selectedId = id;
    setSidebarTab('archive');
    render();
  }

  function showDiscoveryToast(discovery: DiscoveryCard, isNew: boolean): void {
    window.clearTimeout(toastTimer);
    toast.innerHTML = `
      <span class="toast-icon">${isNew ? '✦' : '◆'}</span>
      <span><small>${isNew ? '新考古发现' : '重访遗址'}</small><strong>${discovery.title}</strong></span>
    `;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function setDiscovered(ids: DiscoveryId[]): void {
    discoveredIds = [...ids];
    if (selectedId && !discoveredIds.includes(selectedId)) {
      selectedId = null;
    }
    render();
  }

  function setTravelerPosition(position: Point2): void {
    positionText.textContent = getTravelerRegionLabel(position);
  }

  function setQuestProgress(view: QuestProgressView): void {
    questHasProgress = view.progress.completedChapterIds.length > 0
      || view.progress.activeObjectiveIndex > 0
      || view.progress.treasureIds.length > 0
      || view.progress.knowledgeIds.length > 0;
    questTitle.textContent = view.currentChapter
      ? `${view.currentChapter.numberLabel} · ${view.currentChapter.title}`
      : '长安寻宝完成';
    questSubtitle.textContent = view.currentChapter?.subtitle ?? '八件历史线索已经集齐。';
    questObjective.textContent = view.currentObjective?.title ?? '长安寻宝完成';
    questInstruction.textContent = view.currentObjective?.instruction ?? '继续自由漫游，重读档案与知识卡。';
    questMeterBar.style.width = `${getQuestCompletionPercent(view)}%`;
    clueList.innerHTML = renderClueBag(view.progress);
    for (const button of clueList.querySelectorAll<HTMLButtonElement>('[data-knowledge-id]')) {
      button.addEventListener('click', () => {
        const npc = questNpcs.find((item) => item.knowledge.id === button.dataset.knowledgeId);
        if (npc) {
          showNpcDialogue(npc, false);
        }
      });
    }
    clearProgressButton.disabled = discoveredIds.length === 0 && !questHasProgress;
  }

  function showNpcDialogue(npc: QuestNpc, isNewKnowledge: boolean): void {
    window.clearTimeout(dialogueTimer);
    npcDialogue.innerHTML = `
      <button class="npc-dialogue-close" type="button" aria-label="关闭对话">×</button>
      <div class="npc-dialogue-heading"><span>${npc.role}</span><strong>${npc.name}</strong><small>${isNewKnowledge ? '新知识卡已解锁' : '再次交谈'}</small></div>
      <p>${npc.dialogue.join('</p><p>')}</p>
      <section class="knowledge-card">
        <p class="overline">HISTORY CARD · 历史知识</p>
        <h3>${npc.knowledge.title}</h3>
        <p>${npc.knowledge.summary}</p>
        <dl>
          <div><dt>史料确认</dt><dd>${npc.knowledge.confirmed}</dd></div>
          <div><dt>复原推测</dt><dd>${npc.knowledge.interpretation}</dd></div>
          <div><dt>尚不确定</dt><dd>${npc.knowledge.uncertain}</dd></div>
        </dl>
      </section>
    `;
    npcDialogue.classList.add('is-visible');
    npcDialogue.querySelector<HTMLButtonElement>('.npc-dialogue-close')?.addEventListener('click', () => {
      window.clearTimeout(dialogueTimer);
      npcDialogue.classList.remove('is-visible');
    });
    dialogueTimer = window.setTimeout(() => npcDialogue.classList.remove('is-visible'), 15000);
  }

  function showQuestToast(title: string, subtitle: string): void {
    window.clearTimeout(toastTimer);
    toast.innerHTML = `
      <span class="toast-icon">✦</span>
      <span><small>${subtitle}</small><strong>${title}</strong></span>
    `;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
  }

  render();

  return {
    setDiscovered,
    openDiscovery,
    showDiscoveryToast,
    setTravelerPosition,
    setQuestProgress,
    showNpcDialogue,
    showQuestToast
  };

  function setSidebarTab(tab: 'quest' | 'archive'): void {
    const questActive = tab === 'quest';
    tabQuest.classList.toggle('is-active', questActive);
    tabArchive.classList.toggle('is-active', !questActive);
    tabQuest.setAttribute('aria-selected', String(questActive));
    tabArchive.setAttribute('aria-selected', String(!questActive));
    questView.classList.toggle('is-active', questActive);
    archiveView.classList.toggle('is-active', !questActive);
    questView.hidden = !questActive;
    archiveView.hidden = questActive;
  }
}

function getQuestCompletionPercent(view: QuestProgressView): number {
  const completedChapters = view.progress.completedChapterIds.length;
  const chapterFraction = view.currentChapter
    ? view.progress.activeObjectiveIndex / Math.max(1, view.currentChapter.objectives.length)
    : 0;
  return view.currentChapter ? ((completedChapters + chapterFraction) / questChapters.length) * 100 : 100;
}

function renderClueBag(progress: QuestProgress): string {
  const clues = progress.treasureIds.map((id) => treasureById.get(id)?.name ?? id);
  const knowledgeCards = progress.knowledgeIds.map((id) => knowledgeById.get(id)?.title ?? id);
  if (clues.length === 0 && knowledgeCards.length === 0) {
    return '<p class="empty-clue">尚未获得线索。靠近 NPC 与发光线索开始寻宝。</p>';
  }
  return `
    <div class="clue-row"><span>宝物</span>${clues.map((name) => `<strong>${name}</strong>`).join('') || '<em>未收集</em>'}</div>
    <div class="clue-row"><span>知识卡</span>${progress.knowledgeIds.map((id, index) => `<button type="button" data-knowledge-id="${id}">${knowledgeCards[index]}</button>`).join('') || '<em>未解锁</em>'}</div>
  `;
}

function bindRepeatButton(button: HTMLButtonElement, action: () => void): void {
  let repeatDelay = 0;
  let repeatTimer = 0;

  const stop = (): void => {
    window.clearTimeout(repeatDelay);
    window.clearInterval(repeatTimer);
    repeatDelay = 0;
    repeatTimer = 0;
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    action();
    repeatDelay = window.setTimeout(() => {
      repeatTimer = window.setInterval(action, 90);
    }, 280);
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('click', (event) => {
    if (event.detail === 0) {
      action();
    }
  });
}

export function getTravelerRegionLabel(position: Point2): string {
  const contains = (bounds: typeof changanCity.bounds) => position.x >= bounds.minX
    && position.x <= bounds.maxX && position.z >= bounds.minZ && position.z <= bounds.maxZ;
  if (!contains(changanCity.bounds)) return '城外';

  // Precinct extents take precedence over ordinary city rows and columns.
  const palace = imperialPrecincts.find(precinct => precinct.id === 'taiji-palace')!;
  if (contains(palace.bounds)) {
    return `${position.z >= 264 ? '内廷' : position.z >= 188 ? '太极宫前朝' : '承天门'} · 中央`;
  }
  const imperial = imperialPrecincts.find(precinct => precinct.id === 'imperial-city-axis')!;
  if (contains(imperial.bounds)) return '皇城中轴 · 北段';

  const northSouth = position.z > 8 ? '北段' : position.z < -8 ? '南段' : '中央';
  const eastWest = position.x < 182 ? '西段' : position.x > 206 ? '东段' : '中央';
  if (position.z <= -260 && position.x >= 179 && position.x <= 209) return '南城门 · 中央';
  if (position.z > 288) return `长安北部城垣 · ${eastWest}`;
  const avenue = westMarketWorld.avenues.find(item => item.id === 'zhuque-avenue')!;
  if (Math.abs(position.x - avenue.x) <= avenue.width / 2 && Math.abs(position.z - avenue.z) <= avenue.depth / 2) {
    return `朱雀大街 · ${northSouth}`;
  }
  if (position.x >= -39 && position.x <= 39 && position.z >= -30 && position.z <= 30) {
    return `${position.x < -12 ? '西市西部' : position.x > 12 ? '西市东部' : '西市中街'} · ${northSouth}`;
  }
  if (position.x >= 84 && position.x <= 136 && Math.abs(position.z) <= 68) return `东向街廊 · ${northSouth}`;
  const district = westMarketWorld.districts.find(item => contains(item.bounds));
  if (district) return `${district.label} · ${northSouth}`;
  if (position.x > 203) return `长安东部坊区 · ${northSouth}`;
  if (position.z < -68) return `长安南部坊区 · ${eastWest}`;
  return `长安西部坊区 · ${northSouth}`;
}

function renderArchiveIntro(foundCount: number): string {
  return `
    <div class="intro-card">
      <div class="compass-mark" aria-hidden="true"><span>北</span><i></i></div>
      <p class="overline">ARCHAEOLOGICAL WALK</p>
      <h3>${foundCount === 0 ? '从西门进入长安' : '继续你的实地调查'}</h3>
      <p>${foundCount === 0 ? '点击沙盘上的街道，让微缩旅行者沿路前行。接近重要地点时，档案会自动显现。' : `你已找到 ${foundCount} 处遗址。点击上方已解锁条目重读档案，或继续沿街探索。`}</p>
      <div class="evidence-legend">
        <span><i class="confirmed"></i>史料确认</span>
        <span><i class="interpreted"></i>复原推测</span>
        <span><i class="uncertain"></i>尚不确定</span>
      </div>
    </div>
  `;
}

function renderArchiveCard(discovery: DiscoveryCard): string {
  return `
    <div class="archive-card-heading">
      <span class="big-index">${discovery.indexLabel}</span>
      <div><p class="overline">DISCOVERY RECORD</p><h3>${discovery.title}</h3><p>${discovery.subtitle}</p></div>
    </div>
    <p class="guide-copy">${discovery.guide}</p>
    <section class="evidence-block confirmed-block"><h4><i></i>史料确认</h4><p>${discovery.evidence.confirmed}</p></section>
    <section class="evidence-block interpreted-block"><h4><i></i>复原推测</h4><p>${discovery.evidence.interpretation}</p></section>
    <section class="evidence-block uncertain-block"><h4><i></i>尚不确定</h4><p>${discovery.evidence.uncertain}</p></section>
    <section class="sources-block"><h4>资料线索</h4><ol>${discovery.sources.map((source) => `<li>${source}</li>`).join('')}</ol></section>
  `;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required UI element: ${selector}`);
  }
  return element;
}

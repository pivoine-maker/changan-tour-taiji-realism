import { createAppUi, getTravelerRegionLabel } from './appUi';
import { questChapters, questNpcs } from '../data/quests';
import { createInitialQuestProgress } from '../quests/state';

describe('traveler region label', () => {
  it('keeps palace names inside palace bounds and labels ordinary wards geographically', () => {
    expect(getTravelerRegionLabel({ x: 330, z: 214 })).toBe('长安东部坊区 · 北段');
    expect(getTravelerRegionLabel({ x: 0, z: 214 })).toBe('长安西部坊区 · 北段');
    expect(getTravelerRegionLabel({ x: 330, z: -180 })).toBe('长安东部坊区 · 南段');
    expect(getTravelerRegionLabel({ x: 100, z: -180 })).toBe('长安南部坊区 · 西段');
    expect(getTravelerRegionLabel({ x: 194, z: -270 })).toBe('南城门 · 中央');
    expect(getTravelerRegionLabel({ x: 251, z: 214 })).toBe('长安东部坊区 · 北段');
    expect(getTravelerRegionLabel({ x: 250, z: 214 })).toBe('太极宫前朝 · 中央');
    expect(getTravelerRegionLabel({ x: 138, z: 156 })).toBe('承天门 · 中央');
    expect(getTravelerRegionLabel({ x: 137, z: 156 })).toBe('长安西部坊区 · 北段');
    expect(getTravelerRegionLabel({ x: 194, z: 289 })).toBe('长安北部城垣 · 中央');
    expect(getTravelerRegionLabel({ x: 473, z: 0 })).toBe('城外');
    expect(getTravelerRegionLabel({ x: 204, z: 0 })).toBe('长安东部坊区 · 中央');
  });

  it('names the expanded corridor and Zhuque Avenue', () => {
    expect(getTravelerRegionLabel({ x: 92, z: 10 })).toBe('东向街廊 · 北段');
    expect(getTravelerRegionLabel({ x: 194, z: 0 })).toBe('朱雀大街 · 中央');
  });

  it('names the imperial city axis and Taiji Palace interiors', () => {
    expect(getTravelerRegionLabel({ x: 194, z: 112 })).toBe('皇城中轴 · 北段');
    expect(getTravelerRegionLabel({ x: 194, z: 166 })).toBe('承天门 · 中央');
    expect(getTravelerRegionLabel({ x: 194, z: 214 })).toBe('太极宫前朝 · 中央');
    expect(getTravelerRegionLabel({ x: 194, z: 276 })).toBe('内廷 · 中央');
  });
});

describe('app UI controls', () => {
  it('renders zoom buttons and wires them to callbacks', () => {
    const root = document.createElement('div');
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onLocateNpc = vi.fn();

    createAppUi({
      root,
      onResetView: vi.fn(),
      onLocateTraveler: vi.fn(),
      onLocateNpc,
      onTogglePlaceLabels: vi.fn(),
      onClearProgress: vi.fn(),
      onZoomIn,
      onZoomOut
    });

    expect(root.querySelector('.seal')).toBeNull();
    expect(root.querySelector('.brand-block')?.textContent).not.toContain('西市');
    root.querySelector<HTMLButtonElement>('#zoom-in')?.click();
    root.querySelector<HTMLButtonElement>('#zoom-out')?.click();

    expect(root.querySelector('#locate-traveler')?.textContent).toContain('找到旅人');
    root.querySelector<HTMLButtonElement>('#locate-npc')?.click();
    expect(root.querySelector('#locate-npc')?.textContent).toContain('找到 NPC');
    expect(root.querySelector('#zoom-in')?.textContent).toBe('+');
    expect(root.querySelector('#zoom-out')?.textContent).toBe('−');
    expect(root.querySelector('#phase-mode-hint')?.textContent).toContain('空格键');
    expect(root.querySelector('#phase-mode-hint')?.textContent).toContain('穿越障碍模式');
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onLocateNpc).toHaveBeenCalledTimes(1);
  });

  it('renders quest progress, clue bag, and NPC dialogue', () => {
    const root = document.createElement('div');
    const ui = createAppUi({
      root,
      onResetView: vi.fn(),
      onLocateTraveler: vi.fn(),
      onLocateNpc: vi.fn(),
      onTogglePlaceLabels: vi.fn(),
      onClearProgress: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn()
    });

    ui.setQuestProgress({
      progress: {
        ...createInitialQuestProgress(),
        treasureIds: ['passage-document'],
        knowledgeIds: ['silk-road-trade']
      },
      currentChapter: questChapters[0],
      currentObjective: questChapters[0].objectives[1]
    });
    ui.showNpcDialogue(questNpcs[0], true);

    expect(root.querySelector('.quest-panel')?.textContent).toContain('入市寻牒');
    expect(root.querySelector('.scene-panel .quest-panel')).toBeNull();
    expect(root.querySelector('.archive-panel .quest-panel')).not.toBeNull();
    expect(root.querySelector('.archive-tabs')?.textContent).toContain('寻宝任务');
    expect(root.querySelector('.archive-tabs')?.textContent).toContain('考古发现');
    expect(root.querySelector('.quest-panel')?.textContent).toContain('取得盖印通关牒');
    expect(root.querySelector('.clue-bag')?.textContent).toContain('盖印通关牒');
    expect(root.querySelector('.npc-dialogue')?.textContent).toContain('阿罗罕');
    expect(root.querySelector('.knowledge-card')?.textContent).toContain('丝路商旅与西市');
  });

  it('renders archaeology discoveries in a separate list above the detail card', () => {
    const root = document.createElement('div');

    createAppUi({
      root,
      onResetView: vi.fn(),
      onLocateTraveler: vi.fn(),
      onLocateNpc: vi.fn(),
      onTogglePlaceLabels: vi.fn(),
      onClearProgress: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn()
    });

    const archiveView = root.querySelector<HTMLElement>('#archive-view');
    const discoveryList = root.querySelector<HTMLElement>('#discovery-list');
    const archiveCard = root.querySelector<HTMLElement>('#archive-card');

    expect(archiveView?.contains(discoveryList)).toBe(true);
    expect(archiveView?.contains(archiveCard)).toBe(true);
    expect(discoveryList?.nextElementSibling).toBe(archiveCard);
  });

  it('calculates quest progress across all eight chapters', () => {
    const root = document.createElement('div');
    const ui = createAppUi({
      root,
      onResetView: vi.fn(),
      onLocateTraveler: vi.fn(),
      onLocateNpc: vi.fn(),
      onTogglePlaceLabels: vi.fn(),
      onClearProgress: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn()
    });

    ui.setQuestProgress({
      progress: {
        activeChapterId: questChapters[4].id,
        activeObjectiveIndex: 0,
        completedChapterIds: questChapters.slice(0, 4).map((chapter) => chapter.id),
        treasureIds: [],
        knowledgeIds: []
      },
      currentChapter: questChapters[4],
      currentObjective: questChapters[4].objectives[0]
    });

    expect(root.querySelector<HTMLElement>('#quest-meter-bar')?.style.width).toBe('50%');
  });

  it('toggles the place-name button label and pressed state', () => {
    const onTogglePlaceLabels = vi.fn();
    const root = document.createElement('div');

    createAppUi({
      root,
      onResetView: vi.fn(),
      onLocateTraveler: vi.fn(),
      onLocateNpc: vi.fn(),
      onTogglePlaceLabels,
      onClearProgress: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn()
    });

    const button = root.querySelector<HTMLButtonElement>('#toggle-place-labels');
    expect(button?.textContent).toContain('显示地名');
    expect(button?.getAttribute('aria-pressed')).toBe('false');

    button?.click();
    expect(onTogglePlaceLabels).toHaveBeenCalledWith(true);
    expect(button?.textContent).toContain('隐藏地名');
    expect(button?.getAttribute('aria-pressed')).toBe('true');

    button?.click();
    expect(onTogglePlaceLabels).toHaveBeenCalledWith(false);
    expect(button?.textContent).toContain('显示地名');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
  });

  it('collapses the archive sidebar to give the map more room', () => {
    const root = document.createElement('div');

    createAppUi({
      root,
      onResetView: vi.fn(),
      onLocateTraveler: vi.fn(),
      onLocateNpc: vi.fn(),
      onTogglePlaceLabels: vi.fn(),
      onClearProgress: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn()
    });

    const stage = root.querySelector<HTMLElement>('.game-stage');
    const panel = root.querySelector<HTMLElement>('#archive-panel');
    const body = root.querySelector<HTMLElement>('#archive-panel-body');
    const button = root.querySelector<HTMLButtonElement>('#toggle-archive-panel');

    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(button?.getAttribute('aria-label')).toBe('收起右侧档案栏');

    button?.click();
    expect(stage?.classList.contains('is-archive-collapsed')).toBe(true);
    expect(panel?.classList.contains('is-collapsed')).toBe(true);
    expect(body?.getAttribute('aria-hidden')).toBe('true');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(button?.getAttribute('aria-label')).toBe('展开右侧档案栏');

    button?.click();
    expect(stage?.classList.contains('is-archive-collapsed')).toBe(false);
    expect(panel?.classList.contains('is-collapsed')).toBe(false);
    expect(body?.getAttribute('aria-hidden')).toBe('false');
    expect(button?.getAttribute('aria-expanded')).toBe('true');
  });
});

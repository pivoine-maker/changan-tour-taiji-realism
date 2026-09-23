import {
  questChapterById,
  questChapters,
  questEntityById,
  type KnowledgeId,
  type QuestChapter,
  type QuestChapterId,
  type QuestEntityId,
  type QuestObjective,
  type TreasureId
} from '../data/quests';

const STORAGE_KEY = 'tang-changan-west-market.quests.v1';

export interface QuestProgress {
  activeChapterId: QuestChapterId | null;
  activeObjectiveIndex: number;
  completedChapterIds: QuestChapterId[];
  treasureIds: TreasureId[];
  knowledgeIds: KnowledgeId[];
}

export interface QuestInteractionResult {
  accepted: boolean;
  kind?: 'npc' | 'treasure';
  entityId?: QuestEntityId;
  unlockedKnowledgeId?: KnowledgeId;
  collectedTreasureId?: TreasureId;
  chapterCompletedId?: QuestChapterId;
  gameCompleted?: boolean;
}

export interface QuestState {
  getProgress: () => QuestProgress;
  getCurrentChapter: () => QuestChapter | null;
  getCurrentObjective: () => QuestObjective | null;
  interact: (entityId: QuestEntityId) => QuestInteractionResult;
  reset: () => void;
}

export function createInitialQuestProgress(): QuestProgress {
  return {
    activeChapterId: questChapters[0]?.id ?? null,
    activeObjectiveIndex: 0,
    completedChapterIds: [],
    treasureIds: [],
    knowledgeIds: []
  };
}

export function loadQuestProgress(storage: Storage): QuestProgress {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialQuestProgress();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<QuestProgress>;
    const completedChapterIds = uniqueValid(parsed.completedChapterIds, (id): id is QuestChapterId => questChapterById.has(id as QuestChapterId));
    let activeChapterId = parsed.activeChapterId === null || questChapterById.has(parsed.activeChapterId as QuestChapterId)
      ? parsed.activeChapterId as QuestChapterId | null
      : questChapters[0]?.id ?? null;
    if (activeChapterId === null) {
      activeChapterId = questChapters.find((chapter) => !completedChapterIds.includes(chapter.id))?.id ?? null;
    }
    return {
      activeChapterId,
      activeObjectiveIndex: Number.isInteger(parsed.activeObjectiveIndex) ? Math.max(0, parsed.activeObjectiveIndex ?? 0) : 0,
      completedChapterIds,
      treasureIds: uniqueValid(parsed.treasureIds, (id): id is TreasureId => typeof id === 'string'),
      knowledgeIds: uniqueValid(parsed.knowledgeIds, (id): id is KnowledgeId => typeof id === 'string')
    };
  } catch {
    return createInitialQuestProgress();
  }
}

export function saveQuestProgress(storage: Storage, progress: QuestProgress): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function createQuestState(storage: Storage): QuestState {
  let progress = loadQuestProgress(storage);

  const getCurrentChapter = (): QuestChapter | null => progress.activeChapterId
    ? questChapterById.get(progress.activeChapterId) ?? null
    : null;
  const getCurrentObjective = (): QuestObjective | null => getCurrentChapter()?.objectives[progress.activeObjectiveIndex] ?? null;

  return {
    getProgress: () => cloneProgress(progress),
    getCurrentChapter,
    getCurrentObjective,
    interact: (entityId) => {
      const objective = getCurrentObjective();
      const entity = questEntityById.get(entityId);
      if (!objective || objective.entityId !== entityId || !entity) {
        return { accepted: false };
      }

      const result: QuestInteractionResult = { accepted: true, kind: entity.kind, entityId };
      if (entity.kind === 'npc') {
        progress.knowledgeIds = addUnique(progress.knowledgeIds, entity.knowledge.id);
        result.unlockedKnowledgeId = entity.knowledge.id;
      } else {
        progress.treasureIds = addUnique(progress.treasureIds, entity.treasureId);
        result.collectedTreasureId = entity.treasureId;
      }

      advanceObjective(progress, result);
      saveQuestProgress(storage, progress);
      return result;
    },
    reset: () => {
      progress = createInitialQuestProgress();
      storage.removeItem(STORAGE_KEY);
    }
  };
}

function advanceObjective(progress: QuestProgress, result: QuestInteractionResult): void {
  if (!progress.activeChapterId) {
    return;
  }
  const chapterIndex = questChapters.findIndex((chapter) => chapter.id === progress.activeChapterId);
  const chapter = questChapters[chapterIndex];
  if (!chapter) {
    return;
  }

  if (progress.activeObjectiveIndex < chapter.objectives.length - 1) {
    progress.activeObjectiveIndex += 1;
    return;
  }

  progress.completedChapterIds = addUnique(progress.completedChapterIds, chapter.id);
  result.chapterCompletedId = chapter.id;
  const nextChapter = questChapters[chapterIndex + 1];
  progress.activeChapterId = nextChapter?.id ?? null;
  progress.activeObjectiveIndex = 0;
  result.gameCompleted = !nextChapter;
}

function cloneProgress(progress: QuestProgress): QuestProgress {
  return {
    ...progress,
    completedChapterIds: [...progress.completedChapterIds],
    treasureIds: [...progress.treasureIds],
    knowledgeIds: [...progress.knowledgeIds]
  };
}

function addUnique<T>(values: T[], value: T): T[] {
  return values.includes(value) ? [...values] : [...values, value];
}

function uniqueValid<T>(values: unknown, predicate: (value: unknown) => value is T): T[] {
  return Array.isArray(values) ? Array.from(new Set(values.filter(predicate))) : [];
}

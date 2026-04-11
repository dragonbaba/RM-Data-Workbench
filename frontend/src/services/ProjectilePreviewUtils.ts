import type { TrajectorySegment } from '../types';
export type BattlerType = 'actor' | 'enemy';

const FRAME_RATE = 60;
const MIN_DURATION_FRAMES = 1;

// Project canonical unit: frames only.
export const normalizeDurationFrames = (duration?: number): number => {
  if (!Number.isFinite(duration) || !duration || duration <= 0) {
    return MIN_DURATION_FRAMES;
  }

  return Math.max(Math.trunc(Number(duration)), MIN_DURATION_FRAMES);
};

export const toDurationFrameDisplay = (duration?: number): number => {
  return normalizeDurationFrames(duration);
};

export const segmentDurationToMs = (duration?: number): number => {
  const frames = normalizeDurationFrames(duration);
  return (frames / FRAME_RATE) * 1000;
};

export const buildTrajectoryPoints = (
  segments: TrajectorySegment[],
  startX: number,
  startY: number,
  targetX: number,
  targetY: number
): { x: number; y: number }[] => {
  const points = new Array<{ x: number; y: number }>(segments.length + 1);
  points[0] = { x: startX, y: startY };
  let currentX = startX;
  let currentY = startY;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (i === segments.length - 1) {
      currentX = targetX;
      currentY = targetY;
    } else {
      currentX = Number.isFinite(segment.targetX) ? Number(segment.targetX) : currentX;
      currentY = Number.isFinite(segment.targetY) ? Number(segment.targetY) : currentY;
    }
    points[i + 1] = { x: currentX, y: currentY };
  }

  return points;
};

type RecordLike = Record<string, unknown>;

export const THROW_PROJECTILE_WEAPON_OPTION_ID = -1;
export const THROW_PROJECTILE_WEAPON_LABEL = '投掷物';

const asInt = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const unwrapSystemRecord = (systemData: unknown): RecordLike | null => {
  if (!Array.isArray(systemData)) {
    return systemData && typeof systemData === 'object' ? systemData as RecordLike : null;
  }
  const wrapped = systemData[1];
  return wrapped && typeof wrapped === 'object' ? wrapped as RecordLike : null;
};

const asOffset = (value: unknown): { x: number; y: number } => {
  if (!value || typeof value !== 'object') {
    return { x: 0, y: 0 };
  }

  const offset = value as RecordLike;
  return {
    x: asInt(offset.x),
    y: asInt(offset.y),
  };
};

export const normalizeBattlerType = (value: unknown, fallback: BattlerType = 'actor'): BattlerType => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'actor' || trimmed === '角色' || trimmed === 'ally' || trimmed === 'player') {
    return 'actor';
  }
  if (trimmed === 'enemy' || trimmed === '敌人' || trimmed === 'foe') {
    return 'enemy';
  }
  return fallback;
};

export const findDataEntryById = (data: unknown[] | null, id: number): RecordLike | null => {
  if (!Array.isArray(data) || id <= 0) return null;

  for (let i = 1; i < data.length; i++) {
    const entry = data[i];
    if (!entry || typeof entry !== 'object') continue;
    if (asInt((entry as RecordLike).id) === id) {
      return entry as RecordLike;
    }
  }

  if (id < data.length) {
    const indexed = data[id];
    if (indexed && typeof indexed === 'object') {
      return indexed as RecordLike;
    }
  }

  return null;
};

export const resolveThrowProjectileWtypeId = (systemData: unknown): number => {
  const record = unwrapSystemRecord(systemData) as RecordLike;
  return (record.weaponTypes as unknown[]).length;
};

export const shouldUseStaticActorPreviewFrame = (entry: unknown): boolean => {
  if (!entry || typeof entry !== 'object') return false;

  const meta = (entry as RecordLike).meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return false;
  }

  return (meta as RecordLike).isStaticImage === true;
};

export const resolveActorProjectileOffset = (actor: unknown, weapon: unknown): { x: number; y: number } => {
  if (!actor || typeof actor !== 'object' || !weapon || typeof weapon !== 'object') {
    return { x: 0, y: 0 };
  }

  const wtypeId = asInt((weapon as RecordLike).wtypeId);
  if (wtypeId <= 0) return { x: 0, y: 0 };

  const projectileOffset = (actor as RecordLike).projectileOffset;
  if (!projectileOffset || typeof projectileOffset !== 'object') {
    return { x: 0, y: 0 };
  }

  if (Array.isArray(projectileOffset)) {
    return asOffset(projectileOffset[wtypeId]);
  }

  return asOffset((projectileOffset as RecordLike)[String(wtypeId)]);
};

export const resolveEnemyProjectileOffset = (enemy: unknown, skillId: number): { x: number; y: number } => {
  if (!enemy || typeof enemy !== 'object' || skillId <= 0) {
    return { x: 0, y: 0 };
  }

  const projectileOffset = (enemy as RecordLike).projectileOffset;
  if (!projectileOffset || typeof projectileOffset !== 'object') {
    return { x: 0, y: 0 };
  }

  if (Array.isArray(projectileOffset)) {
    return asOffset(projectileOffset[skillId]);
  }

  return asOffset((projectileOffset as RecordLike)[String(skillId)]);
};

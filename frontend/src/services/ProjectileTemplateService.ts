import type { ProjectileTemplate } from '../types';

const MIN_DURATION_FRAMES = 1;

const toIntOrZero = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
};

const normalizeDurationFrames = (duration: unknown): number => {
  const frames = toIntOrZero(duration);
  return Math.max(frames, MIN_DURATION_FRAMES);
};

const normalizeBattlerType = (value: unknown, fallback: 'actor' | 'enemy'): 'actor' | 'enemy' => {
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

const normalizeEaseName = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

export const createDefaultProjectileTemplate = (): ProjectileTemplate => ({
  name: '新弹道',
  startAnimationId: 0,
  launchAnimation: {
    animationId: 0,
    segments: [
      {
        targetX: 0,
        targetY: -120,
        duration: 60,
        easeX: 'linear',
        easeY: 'linear',
      },
    ],
  },
  endAnimationId: 0,
  sourceType: 'actor',
  sourceId: 0,
  targetType: 'enemy',
  targetId: 0,
});

export const cloneProjectileTemplate = (
  source: ProjectileTemplate,
  overrides: Partial<ProjectileTemplate> = {},
): ProjectileTemplate => ({
  ...source,
  ...overrides,
  launchAnimation: {
    animationId: source.launchAnimation?.animationId || 0,
    segments: Array.isArray(source.launchAnimation?.segments)
      ? source.launchAnimation.segments.map((segment) => ({ ...segment }))
      : [],
  },
});

export const normalizeProjectileDataEntry = (value: unknown): ProjectileTemplate | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const launchAnimationSource = source.launchAnimation;
  const launchAnimation = (
    launchAnimationSource && typeof launchAnimationSource === 'object' && !Array.isArray(launchAnimationSource)
      ? launchAnimationSource
      : {}
  ) as Record<string, unknown>;
  const segmentSource = Array.isArray(launchAnimation.segments) ? launchAnimation.segments : [];

  const segments = segmentSource.map((segment) => {
    const current = (segment && typeof segment === 'object' && !Array.isArray(segment))
      ? (segment as Record<string, unknown>)
      : {};
    const { easing: _legacyEasing, ...rest } = current;
    const legacyEasing = normalizeEaseName(current.easing);
    const easeX = normalizeEaseName(current.easeX) || legacyEasing || 'linear';
    const easeY = normalizeEaseName(current.easeY) || legacyEasing || 'linear';

    return {
      ...rest,
      targetX: toIntOrZero(current.targetX),
      targetY: toIntOrZero(current.targetY),
      duration: normalizeDurationFrames(current.duration),
      easeX,
      easeY,
    };
  });

  return {
    ...(source as unknown as ProjectileTemplate),
    name: typeof source.name === 'string' && source.name.trim().length > 0 ? source.name : '新弹道',
    startAnimationId: Math.max(0, toIntOrZero(source.startAnimationId)),
    launchAnimation: {
      animationId: Math.max(0, toIntOrZero(launchAnimation.animationId)),
      segments,
    },
    endAnimationId: Math.max(0, toIntOrZero(source.endAnimationId)),
    sourceType: normalizeBattlerType(source.sourceType, 'actor'),
    sourceId: Math.max(0, toIntOrZero(source.sourceId)),
    targetType: normalizeBattlerType(source.targetType, 'enemy'),
    targetId: Math.max(0, toIntOrZero(source.targetId)),
    weaponId: Math.max(0, toIntOrZero(source.weaponId)),
    skillId: Math.max(0, toIntOrZero(source.skillId)),
  };
};

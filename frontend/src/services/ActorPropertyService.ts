import type { RPGItem } from '../types';

export const KNOWN_ACTOR_PROPERTY_KEYS = [
  'isStaticImage',
  'isTank',
] as const;

export interface ActorEditorValues {
  isStaticImage: boolean;
  isTank: boolean;
}

export interface ActorEditorInput {
  isStaticImage?: unknown;
  isTank?: unknown;
}

type RecordLike = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordLike => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'string') return value === 'true';
  return value === true;
};

const hasLegacyNoteFlag = (note: unknown, key: 'isStaticImage' | 'isTank'): boolean => {
  if (typeof note !== 'string') return false;
  return note.includes(`<${key}>`) || note.includes(`<${key}:true>`);
};

const omitActorLegacyNoteFlags = (note: unknown): unknown => {
  if (typeof note !== 'string') return note;
  return note
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== '<isStaticImage>'
        && trimmed !== '<isStaticImage:true>'
        && trimmed !== '<isTank>'
        && trimmed !== '<isTank:true>';
    })
    .join('\\n');
};

const omitActorLegacyMetaFlags = (meta: RecordLike): RecordLike => {
  const { isStaticImage: _isStaticImage, isTank: _isTank, ...rest } = meta;
  return rest;
};

export function normalizeActorEditorValues(actor: unknown): ActorEditorValues {
  if (!isRecord(actor)) {
    return {
      isStaticImage: false,
      isTank: false,
    };
  }

  const meta = isRecord(actor.meta) ? actor.meta : null;
  const note = actor.note;
  return {
    isStaticImage: Object.prototype.hasOwnProperty.call(actor, 'isStaticImage')
      ? toBooleanFlag(actor.isStaticImage)
      : toBooleanFlag(meta?.isStaticImage) || hasLegacyNoteFlag(note, 'isStaticImage'),
    isTank: Object.prototype.hasOwnProperty.call(actor, 'isTank')
      ? toBooleanFlag(actor.isTank)
      : toBooleanFlag(meta?.isTank) || hasLegacyNoteFlag(note, 'isTank'),
  };
}

export function normalizeActorDataEntry(actor: unknown): RPGItem | null {
  if (!isRecord(actor)) return null;

  const normalized = normalizeActorEditorValues(actor);
  const currentMeta = isRecord(actor.meta) ? actor.meta : null;
  const nextEntry = {
    ...(actor as unknown as RPGItem),
    ...(currentMeta ? { meta: omitActorLegacyMetaFlags(currentMeta) } : {}),
    note: omitActorLegacyNoteFlags(actor.note) as string | undefined,
    isStaticImage: normalized.isStaticImage,
    isTank: normalized.isTank,
  };
  if (nextEntry.note === undefined) delete nextEntry.note;
  return nextEntry;
}

export function hasActorEditorChanges(sourceItem: RPGItem, nextValues: ActorEditorInput): boolean {
  const currentValues = normalizeActorEditorValues(sourceItem);
  return currentValues.isStaticImage !== toBooleanFlag(nextValues.isStaticImage)
    || currentValues.isTank !== toBooleanFlag(nextValues.isTank);
}

export function buildActorSaveData(sourceItem: RPGItem, nextValues: ActorEditorInput): RPGItem {
  const currentMeta = isRecord(sourceItem.meta) ? sourceItem.meta : null;
  const nextItem: RPGItem = {
    ...sourceItem,
    ...(currentMeta ? { meta: omitActorLegacyMetaFlags(currentMeta) } : {}),
    note: omitActorLegacyNoteFlags(sourceItem.note) as string | undefined,
    isStaticImage: toBooleanFlag(nextValues.isStaticImage),
    isTank: toBooleanFlag(nextValues.isTank),
  };
  if (nextItem.note === undefined) delete nextItem.note;
  return nextItem;
}

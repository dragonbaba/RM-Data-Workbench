const INT_REGEX = /^-?\d+$/;
const FLOAT_REGEX = /^-?\d+\.\d+$/;
const META_TAG_REGEX = /<([^<>:]+)(:?)([^>]*)>/g;

function isNumberString(value: string): boolean {
  return INT_REGEX.test(value) || FLOAT_REGEX.test(value);
}

function isBooleanString(value: string): boolean {
  return value === 'true' || value === 'false';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toParsedValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (isNumberString(value)) return Number(value);
    if (isBooleanString(value)) return value === 'true';
    value = safeJsonParse(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => toParsedValue(item));
  }

  if (isObject(value)) {
    const nextValue: Record<string, unknown> = {};
    Object.keys(value).forEach((key) => {
      nextValue[key] = toParsedValue(value[key]);
    });
    return nextValue;
  }

  return value;
}

function normalizeMetadata(meta: unknown): Record<string, unknown> {
  if (!isObject(meta)) return {};
  return meta as Record<string, unknown>;
}

export interface EnsuredItemMetaResult<T = Record<string, unknown>> {
  item: T | null;
  changed: boolean;
}

export function extractMetadataFromNote(note: string | null | undefined): Record<string, unknown> {
  const source = typeof note === 'string' ? note : '';
  const metaInfo: Record<string, unknown> = Object.create(null);

  for (const tag of source.matchAll(META_TAG_REGEX)) {
    const tagName = tag[1];
    const tagPattern = tag[2];
    const tagValue = tag[3];
    metaInfo[tagName] = tagPattern === ':' ? toParsedValue(tagValue) : true;
  }

  return metaInfo;
}

export function ensureItemMeta<T = Record<string, unknown>>(item: unknown): EnsuredItemMetaResult<T> {
  if (!isObject(item) || Array.isArray(item)) {
    return { item: null, changed: false };
  }

  if (Object.prototype.hasOwnProperty.call(item, 'meta')) {
    return { item: item as T, changed: false };
  }

  const note = typeof item.note === 'string' ? item.note : '';
  const meta = extractMetadataFromNote(note);
  if (Object.keys(meta).length === 0) {
    return { item: item as T, changed: false };
  }

  return {
    item: {
      ...item,
      meta,
    } as T,
    changed: true,
  };
}

export function isMetadataEqual(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeMetadata(left);
  const normalizedRight = normalizeMetadata(right);
  return isMetadataValueEqual(normalizedLeft, normalizedRight);
}

function isMetadataValueEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => isMetadataValueEqual(item, right[index]));
  }

  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;

    return leftKeys.every((key) => {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      return isMetadataValueEqual(left[key], right[key]);
    });
  }

  return false;
}

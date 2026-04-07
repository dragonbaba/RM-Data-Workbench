import { normalizeEnemyDataEntry } from './EnemyPropertyService';
import { normalizeEquipmentDataEntry } from './EquipmentPropertyService';
import { arePlainDataEqual } from './PlainDataCompare';
import { normalizeSkillDataEntry } from './SkillPropertyService';
import { normalizeStandardDataForEditor } from './DataFileFormatService';

export const AUDIT_TARGET_FILE_NAMES = [
  'Skills.json',
  'Enemies.json',
  'Weapons.json',
  'Armors.json',
] as const;

export const SYSTEM_FILE_NAME = 'System.json';

export interface DataAuditFileResult {
  fileName: string;
  filePath: string;
  checkedEntries: number;
  repairedEntries: number;
  changed: boolean;
}

export interface DataAuditSummary {
  checkedFiles: number;
  repairedFiles: number;
  repairedEntries: number;
  results: DataAuditFileResult[];
}

export interface DataAuditDependencies {
  readJson: (filePath: string) => Promise<unknown>;
  writeJson: (filePath: string, data: unknown) => Promise<unknown>;
}

const joinPath = (basePath: string, fileName: string) => {
  if (!basePath) return fileName;
  return `${basePath.replace(/[\\/]+$/, '')}/${fileName}`;
};

const normalizeFilePayload = (fileName: string, data: unknown): unknown[] => {
  const normalized = normalizeStandardDataForEditor(fileName, data);
  if (!normalized) {
    throw new Error(`无法读取标准数据文件: ${fileName}`);
  }
  return normalized;
};

const normalizeEntryByFileName = (
  fileName: string,
  entry: unknown,
  systemData: unknown,
) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return entry;
  }

  if (fileName === 'Skills.json') {
    return normalizeSkillDataEntry(entry) ?? entry;
  }

  if (fileName === 'Enemies.json') {
    return normalizeEnemyDataEntry(entry) ?? entry;
  }

  if (fileName === 'Weapons.json') {
    return normalizeEquipmentDataEntry(entry, { isWeapon: true, systemData }) ?? entry;
  }

  if (fileName === 'Armors.json') {
    return normalizeEquipmentDataEntry(entry, { isArmor: true, systemData }) ?? entry;
  }

  return entry;
};

export async function auditAndRepairDataFiles(
  dataPath: string,
  deps: DataAuditDependencies,
): Promise<DataAuditSummary> {
  const systemPath = joinPath(dataPath, SYSTEM_FILE_NAME);
  const systemData = await deps.readJson(systemPath);
  const results: DataAuditFileResult[] = [];

  for (const fileName of AUDIT_TARGET_FILE_NAMES) {
    const filePath = joinPath(dataPath, fileName);
    const rawData = await deps.readJson(filePath);
    const currentData = normalizeFilePayload(fileName, rawData);
    const nextData = [...currentData];
    let repairedEntries = 0;
    let checkedEntries = 0;

    for (let index = 1; index < currentData.length; index++) {
      const currentEntry = currentData[index];
      if (!currentEntry || typeof currentEntry !== 'object' || Array.isArray(currentEntry)) {
        continue;
      }

      checkedEntries++;
      const normalizedEntry = normalizeEntryByFileName(fileName, currentEntry, systemData);
      if (!arePlainDataEqual(normalizedEntry, currentEntry)) {
        nextData[index] = normalizedEntry;
        repairedEntries++;
      }
    }

    const changed = repairedEntries > 0;
    if (changed) {
      await deps.writeJson(filePath, nextData);
    }

    results.push({
      fileName,
      filePath,
      checkedEntries,
      repairedEntries,
      changed,
    });
  }

  return {
    checkedFiles: results.length,
    repairedFiles: results.filter((item) => item.changed).length,
    repairedEntries: results.reduce((sum, item) => sum + item.repairedEntries, 0),
    results,
  };
}

export const toAuditSummaryText = (summary: DataAuditSummary): string => {
  const changedItems = summary.results.filter((item) => item.changed);
  if (changedItems.length === 0) {
    return `已检查 ${summary.checkedFiles} 个文件，未发现需要修复的数据。`;
  }

  const detail = changedItems
    .map((item) => `${item.fileName} ${item.repairedEntries} 条`)
    .join('，');

  return `已检查 ${summary.checkedFiles} 个文件，修复 ${summary.repairedFiles} 个文件，共 ${summary.repairedEntries} 条：${detail}`;
};

export const isAuditTargetFile = (fileName: string) => {
  return AUDIT_TARGET_FILE_NAMES.includes(fileName as typeof AUDIT_TARGET_FILE_NAMES[number]);
};

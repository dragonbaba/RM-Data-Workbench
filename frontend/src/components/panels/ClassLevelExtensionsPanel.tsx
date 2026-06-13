import { Card, Empty, InputNumber, Select, Space, Tag } from 'antd';
import { useMemo } from 'react';
import { DataLoaderService } from '../../services/DataLoaderService';
import {
  buildClassLevelPreview,
  CLASS_BASE_LEVEL_ANCHOR,
  CLASS_EXTENDED_MIN_LEVEL,
  CLASS_LEVEL_EXTENSIONS_FILE_NAME,
  DEFAULT_CLASS_EXTENSION_MAX_LEVEL,
  getClassBaseParamsAtLevel,
  getClassLevelExtension,
  setClassLevelExtension,
  type ClassExpParams,
  type ClassGrowthMode,
  type ClassLevelExtension,
  type ClassLevelExtensionsData,
} from '../../services/ClassLevelExtensionsService';

interface ClassLevelExtensionsPanelProps {
  classEntry: unknown;
  classIndex: number;
  filePath: string;
  data: ClassLevelExtensionsData | null;
  attributeLabels: string[];
  markFileDirty: (filePath: string) => void;
  markItemDirty: (filePath: string, itemIndex: number) => void;
  onChanged: () => void;
}

const EXP_PARAM_LABELS = ['基础值', '补正值', '增加度1', '增加度2'];
const GROWTH_MODE_OPTIONS: Array<{ value: ClassGrowthMode; label: string }> = [
  { value: 'standard', label: '标准' },
  { value: 'early', label: '早熟' },
  { value: 'late', label: '晚熟' },
  { value: 'linear', label: '线性' },
];

const toNonNegativeInt = (value: unknown): number => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.trunc(numberValue));
};

const cloneExtension = (extension: ClassLevelExtension): ClassLevelExtension => ({
  maxLevel: extension.maxLevel,
  expParams: extension.expParams.slice(0, 4) as ClassExpParams,
  paramCurves: extension.paramCurves.map((entry) => ({
    target: entry.target,
    mode: entry.mode,
  })),
});

export function ClassLevelExtensionsPanel({
  classEntry,
  classIndex,
  filePath,
  data,
  attributeLabels,
  markFileDirty,
  markItemDirty,
  onChanged,
}: ClassLevelExtensionsPanelProps) {
  const baseParams = useMemo(
    () => getClassBaseParamsAtLevel(classEntry, CLASS_BASE_LEVEL_ANCHOR),
    [classEntry],
  );
  const extension = useMemo(
    () => cloneExtension(getClassLevelExtension(data, classIndex, classEntry)),
    [classEntry, classIndex, data],
  );
  const previewRows = useMemo(
    () => buildClassLevelPreview(classEntry, extension),
    [classEntry, extension],
  );

  const commitExtension = (nextExtension: ClassLevelExtension) => {
    if (!filePath || classIndex <= 0) return;
    const nextData = setClassLevelExtension(data, classIndex, nextExtension, classEntry);
    DataLoaderService.cacheFileData(filePath, CLASS_LEVEL_EXTENSIONS_FILE_NAME, nextData);
    markFileDirty(filePath);
    markItemDirty(filePath, classIndex);
    onChanged();
  };

  const getWorkingExtension = () => {
    const cachedData = DataLoaderService.getCachedDataByName<ClassLevelExtensionsData>(CLASS_LEVEL_EXTENSIONS_FILE_NAME);
    return cloneExtension(getClassLevelExtension(cachedData ?? data, classIndex, classEntry));
  };

  const handleUpdateMaxLevel = (value: unknown) => {
    const current = getWorkingExtension();
    commitExtension({
      ...current,
      maxLevel: Math.max(CLASS_EXTENDED_MIN_LEVEL, toNonNegativeInt(value) || DEFAULT_CLASS_EXTENSION_MAX_LEVEL),
    });
  };

  const handleUpdateExpParam = (paramIndex: number, value: unknown) => {
    const current = getWorkingExtension();
    const expParams = current.expParams.slice(0, 4) as ClassExpParams;
    expParams[paramIndex] = toNonNegativeInt(value);
    commitExtension({
      ...current,
      expParams,
    });
  };

  const handleUpdateParamTarget = (paramIndex: number, value: unknown) => {
    const current = getWorkingExtension();
    const paramCurves = current.paramCurves.map((entry, index) => (
      index === paramIndex
        ? { ...entry, target: toNonNegativeInt(value) }
        : entry
    ));
    commitExtension({
      ...current,
      paramCurves,
    });
  };

  const handleUpdateParamMode = (paramIndex: number, mode: ClassGrowthMode) => {
    const current = getWorkingExtension();
    const paramCurves = current.paramCurves.map((entry, index) => (
      index === paramIndex
        ? { ...entry, mode }
        : entry
    ));
    commitExtension({
      ...current,
      paramCurves,
    });
  };

  return (
    <Card
      title="拓展等级"
      className="mb-4"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Tag color="blue">99 级基准</Tag>
        {baseParams.map((value, index) => (
          <Tag key={attributeLabels[index] ?? index}>
            {(attributeLabels[index] ?? `参数${index}`)}: {value}
          </Tag>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-x-4 gap-y-4 mb-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">最大等级</div>
          <InputNumber
            min={CLASS_EXTENDED_MIN_LEVEL}
            precision={0}
            step={1}
            value={extension.maxLevel}
            className="w-full"
            aria-label="拓展最大等级"
            onChange={handleUpdateMaxLevel}
          />
        </div>
        {EXP_PARAM_LABELS.map((label, index) => (
          <div key={label}>
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <InputNumber
              min={0}
              precision={0}
              step={1}
              value={extension.expParams[index]}
              className="w-full"
              aria-label={`经验曲线${label}`}
              onChange={(value) => handleUpdateExpParam(index, value)}
            />
          </div>
        ))}
      </div>

      <div className="overflow-x-auto mb-4">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[minmax(130px,1fr)_110px_150px_150px] gap-2 mb-2 text-xs text-gray-500">
            <span>属性</span>
            <span>99 级</span>
            <span>最大等级目标</span>
            <span>成长模式</span>
          </div>
          <Space direction="vertical" size={8} className="w-full">
            {extension.paramCurves.map((curve, paramIndex) => (
              <div
                key={`${attributeLabels[paramIndex] ?? paramIndex}-${paramIndex}`}
                className="grid grid-cols-[minmax(130px,1fr)_110px_150px_150px] gap-2 items-center"
              >
                <span className="text-sm">{attributeLabels[paramIndex] ?? `参数${paramIndex}`}</span>
                <Tag className="m-0 w-fit">{baseParams[paramIndex] ?? 0}</Tag>
                <InputNumber
                  min={0}
                  precision={0}
                  step={1}
                  value={curve.target}
                  className="w-full"
                  aria-label={`${attributeLabels[paramIndex] ?? `参数${paramIndex}`} 最大等级目标`}
                  onChange={(value) => handleUpdateParamTarget(paramIndex, value)}
                />
                <Select
                  value={curve.mode}
                  options={GROWTH_MODE_OPTIONS}
                  className="w-full"
                  aria-label={`${attributeLabels[paramIndex] ?? `参数${paramIndex}`} 成长模式`}
                  onChange={(value) => handleUpdateParamMode(paramIndex, value)}
                />
              </div>
            ))}
          </Space>
        </div>
      </div>

      <div className="rounded border border-gray-200 p-3">
        <div className="text-sm font-medium mb-3">自动预览</div>
        {previewRows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 100+ 等级" />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[960px] max-h-[360px] overflow-y-auto pr-1">
              <div className="grid grid-cols-[72px_120px_repeat(8,minmax(82px,1fr))] gap-2 sticky top-0 bg-white z-10 pb-2 text-xs text-gray-500">
                <span>等级</span>
                <span>经验</span>
                {attributeLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
              <Space direction="vertical" size={6} className="w-full">
                {previewRows.map((entry) => (
                  <div
                    key={entry.level}
                    className="grid grid-cols-[72px_120px_repeat(8,minmax(82px,1fr))] gap-2 items-center text-sm"
                  >
                    <span>{entry.level}</span>
                    <span>{entry.exp}</span>
                    {entry.params.map((value, paramIndex) => (
                      <span key={`${entry.level}-${paramIndex}`}>{value}</span>
                    ))}
                  </div>
                ))}
              </Space>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ClassLevelExtensionsPanel;

import { Card, Input, Badge, Tag } from 'antd';
import { FileTextOutlined, MessageOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ensureItemMeta, extractMetadataFromNote, isMetadataEqual } from '../../services/NoteMetadataService';

export function NotePanel() {
  const currentItem = useEditorStore((state) => state.currentItem);
  const currentItemIndex = useEditorStore((state) => state.currentItemIndex);
  const currentData = useEditorStore((state) => state.currentData);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const currentFileType = useEditorStore((state) => state.currentFileType);
  const loadData = useEditorStore((state) => state.loadData);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const markItemDirty = useEditorStore((state) => state.markItemDirty);
  
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  // 加载当前项目数据
  useEffect(() => {
    if (currentItem) {
      const item = currentItem as any;
      const descText = Array.isArray(item.description) 
        ? item.description.join('\n') 
        : item.description || '';
      
      setDescription(descText);
      setNote(item.note || '');
    }
  }, [currentItem]);

  useEffect(() => {
    if (!Array.isArray(currentData) || currentItemIndex < 0 || !currentItem) {
      return;
    }

    const ensured = ensureItemMeta(currentItem);
    if (!ensured.changed || !ensured.item) {
      return;
    }

    const nextData = [...currentData];
    nextData[currentItemIndex] = ensured.item as any;

    loadData(nextData as any[], currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }
  }, [currentData, currentFilePath, currentFileType, currentItem, currentItemIndex, loadData, markFileDirty, markItemDirty]);

  const sourceDescription = useMemo(() => {
    const item = currentItem as any;
    if (!item) return '';
    return Array.isArray(item.description)
      ? item.description.join('\n')
      : (item.description || '');
  }, [currentItem]);
  const sourceNote = useMemo(() => {
    const item = currentItem as any;
    return item?.note || '';
  }, [currentItem]);

  // 检查是否有未保存的更改
  const hasDescriptionChanges = description !== sourceDescription;
  const hasNoteChanges = note !== sourceNote;
  const hasAnyChanges = hasDescriptionChanges || hasNoteChanges;
  const itemMeta = useMemo(() => {
    const meta = (currentItem as any)?.meta;
    return meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};
  }, [currentItem]);
  const parsedMeta = useMemo(() => extractMetadataFromNote(note), [note]);
  const metadataEntries = useMemo(() => Object.entries(parsedMeta), [parsedMeta]);
  const shouldRegenerateMeta = useMemo(
    () => !isMetadataEqual(itemMeta, parsedMeta),
    [itemMeta, parsedMeta]
  );

  useEffect(() => {
    if (!hasAnyChanges || !currentData || currentItemIndex < 0) return;

    const timer = window.setTimeout(() => {
      const sourceItem = currentData[currentItemIndex] as any;
      if (!sourceItem) return;

      const generatedMeta = extractMetadataFromNote(note);
      const currentMeta = sourceItem.meta && typeof sourceItem.meta === 'object' ? sourceItem.meta : {};
      const needRegenerateMeta = !isMetadataEqual(currentMeta, generatedMeta);
      const nextDescription = description.split('\n').filter((line) => line.trim() !== '');

      const updatedItem = {
        ...sourceItem,
        description: nextDescription,
        note,
        ...(needRegenerateMeta ? { meta: generatedMeta } : {}),
      };
      const newData = [...currentData];
      newData[currentItemIndex] = updatedItem;

      loadData(newData as any[], currentFilePath || '', currentFileType);
      if (currentFilePath) {
        markFileDirty(currentFilePath);
        markItemDirty(currentFilePath, currentItemIndex);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    currentData,
    currentFilePath,
    currentFileType,
    currentItemIndex,
    description,
    hasAnyChanges,
    loadData,
    markFileDirty,
    markItemDirty,
    note,
  ]);

  if (!currentItem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">请选择左侧项目以编辑备注</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-dark-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
          备注编辑
        </h2>
        <span className="text-xs text-gray-500">自动记录变更并标记脏文件</span>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
        {/* 左侧：描述输入 */}
        <Card
          className="h-full"
          bodyStyle={{
            height: '100%',
            padding: '16px',
            backgroundColor: '#1a1f2e',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400 flex items-center">
              <FileTextOutlined className="mr-2" />
              附加描述
              {hasDescriptionChanges && (
                <Badge dot color="orange" className="ml-2" />
              )}
            </span>
          </div>
          <Input.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入描述内容...&#10;每行将作为 description 数组的一个元素"
            className="flex-1 resize-none"
            style={{
              backgroundColor: '#0f1419',
              borderColor: hasDescriptionChanges ? 'var(--color-warning)' : '#2a3f5f',
              minHeight: '200px',
            }}
          />
        </Card>

        {/* 中间：备注输入 */}
        <Card
          className="h-full"
          bodyStyle={{
            height: '100%',
            padding: '16px',
            backgroundColor: '#1a1f2e',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400 flex items-center">
              <MessageOutlined className="mr-2" />
              备注内容
              {hasNoteChanges && <Badge dot color="orange" className="ml-2" />}
            </span>
          </div>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="请输入备注内容...&#10;支持 RPG Meta 标签，例如 <weaponImageId:19>、<boss>"
            className="flex-1 resize-none"
            style={{
              backgroundColor: '#0f1419',
              borderColor: hasNoteChanges ? 'var(--color-warning)' : '#2a3f5f',
              minHeight: '200px',
            }}
          />
        </Card>

        {/* 右侧：元数据预览 */}
        <Card
          className="h-full"
          bodyStyle={{
            height: '100%',
            padding: '16px',
            backgroundColor: '#1a1f2e',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400 flex items-center">
              <DatabaseOutlined className="mr-2" />
              元数据预览
              {shouldRegenerateMeta && <Badge dot color="orange" className="ml-2" />}
            </span>
            <Tag color={shouldRegenerateMeta ? 'orange' : 'green'}>
              {shouldRegenerateMeta ? '自动同步后更新' : '无需更新'}
            </Tag>
          </div>

          <div className="text-xs text-gray-500 mb-3">
            备注中的 Meta 标签会按旧项目规则解析并与当前元数据对比。
          </div>

          <div
            className="flex-1 overflow-y-auto rounded border p-2"
            style={{ borderColor: '#2a3f5f', backgroundColor: '#0f1419' }}
          >
            {metadataEntries.length === 0 ? (
              <p className="text-gray-500 text-sm">未检测到可解析的 Meta 标签</p>
            ) : (
              <div className="space-y-2">
                {metadataEntries.map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-cyan-300">{key}</span>
                    <span className="text-gray-400">: </span>
                    <span className="text-gray-200">{formatMetadataValue(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default NotePanel;

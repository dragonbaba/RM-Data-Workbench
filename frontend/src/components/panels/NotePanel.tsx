import { Card, Input, Badge, Tag } from 'antd';
import { FileTextOutlined, MessageOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ensureItemMeta, extractMetadataFromNote, isMetadataEqual } from '../../services/NoteMetadataService';

interface NotePanelProps {
  embedded?: boolean;
}

export function NotePanel({ embedded = false }: NotePanelProps) {
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
      const nextDescription = description.split('\n');

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

  const content = (
    <Card
      title="文本与备注"
      className={embedded ? 'mb-4' : 'h-full'}
      bodyStyle={{ backgroundColor: '#1a1f2e', padding: embedded ? '12px' : '16px' }}
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="min-h-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 flex items-center">
              <FileTextOutlined className="mr-2" />
              附加描述
              {hasDescriptionChanges && <Badge dot color="orange" className="ml-2" />}
            </span>
          </div>
          <Input.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="每行保存为 description 数组的一项"
            rows={embedded ? 6 : 10}
            className="resize-none"
            style={{
              backgroundColor: '#0f1419',
              borderColor: hasDescriptionChanges ? 'var(--color-warning)' : '#2a3f5f',
            }}
          />
        </div>

        <div className="min-h-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 flex items-center">
              <MessageOutlined className="mr-2" />
              备注内容
              {hasNoteChanges && <Badge dot color="orange" className="ml-2" />}
            </span>
          </div>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="支持 <weaponImageId:19>、<boss> 等 Meta 标签"
            rows={embedded ? 6 : 10}
            className="resize-none"
            style={{
              backgroundColor: '#0f1419',
              borderColor: hasNoteChanges ? 'var(--color-warning)' : '#2a3f5f',
            }}
          />
        </div>

        <div className="min-h-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 flex items-center">
              <DatabaseOutlined className="mr-2" />
              元数据预览
              {shouldRegenerateMeta && <Badge dot color="orange" className="ml-2" />}
            </span>
            <Tag color={shouldRegenerateMeta ? 'orange' : 'green'}>
              {shouldRegenerateMeta ? '将更新' : '同步'}
            </Tag>
          </div>

          <div
            className="overflow-y-auto rounded border p-2"
            style={{
              borderColor: '#2a3f5f',
              backgroundColor: '#0f1419',
              height: embedded ? 160 : 280,
            }}
          >
            {metadataEntries.length === 0 ? (
              <p className="text-gray-500 text-xs">未检测到 Meta 标签</p>
            ) : (
              <div className="space-y-1">
                {metadataEntries.map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-cyan-300">{key}</span>
                    <span className="text-gray-400">: </span>
                    <span className="text-gray-200">{formatMetadataValue(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-dark-900">
      {content}
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

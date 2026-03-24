import { Card, Input, Button, Badge, Tag } from 'antd';
import { SaveOutlined, FileTextOutlined, MessageOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ToastManager } from '../common/ToastManager';
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
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalNote, setOriginalNote] = useState('');

  // 加载当前项目数据
  useEffect(() => {
    if (currentItem) {
      const item = currentItem as any;
      const descText = Array.isArray(item.description) 
        ? item.description.join('\n') 
        : item.description || '';
      
      setDescription(descText);
      setOriginalDescription(descText);
      setNote(item.note || '');
      setOriginalNote(item.note || '');
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

  // 检查是否有未保存的更改
  const hasDescriptionChanges = description !== originalDescription;
  const hasNoteChanges = note !== originalNote;
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

  // 保存描述
  const handleSaveDescription = useCallback(() => {
    if (!currentData || currentItemIndex < 0) return;

    const sourceItem = currentData[currentItemIndex] as any;
    if (!sourceItem) return;

    const updatedItem = {
      ...sourceItem,
      description: description.split('\n').filter((line) => line.trim() !== ''),
    };
    const newData = [...currentData];
    newData[currentItemIndex] = updatedItem;

    loadData(newData as any[], currentFilePath || '', currentFileType);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
      markItemDirty(currentFilePath, currentItemIndex);
    }

    setOriginalDescription(description);
    ToastManager.success('描述已保存');
  }, [currentData, currentItemIndex, description, currentFilePath, currentFileType, loadData, markFileDirty, markItemDirty]);

  // 保存备注
  const handleSaveNote = useCallback(() => {
    if (!currentData || currentItemIndex < 0) return;

    const sourceItem = currentData[currentItemIndex] as any;
    if (!sourceItem) return;

    const generatedMeta = extractMetadataFromNote(note);
    const currentMeta = sourceItem.meta && typeof sourceItem.meta === 'object' ? sourceItem.meta : {};
    const needRegenerateMeta = !isMetadataEqual(currentMeta, generatedMeta);

    const updatedItem = {
      ...sourceItem,
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

    setOriginalNote(note);
    ToastManager.success(needRegenerateMeta ? '备注已保存，元数据已更新' : '备注已保存，元数据无变化');
  }, [currentData, currentItemIndex, note, currentFilePath, currentFileType, loadData, markFileDirty, markItemDirty]);

  // 保存所有
  const handleSaveAll = useCallback(() => {
    if (hasDescriptionChanges) handleSaveDescription();
    if (hasNoteChanges) handleSaveNote();
  }, [hasDescriptionChanges, hasNoteChanges, handleSaveDescription, handleSaveNote]);

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
        {hasAnyChanges && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            保存全部
          </Button>
        )}
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
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSaveDescription}
              disabled={!hasDescriptionChanges}
            >
              保存
            </Button>
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
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSaveNote}
              disabled={!hasNoteChanges}
            >
              保存
            </Button>
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
              {shouldRegenerateMeta ? '保存时将更新' : '无需更新'}
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

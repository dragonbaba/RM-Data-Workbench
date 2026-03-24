import { Button, Card, Descriptions, Empty, Form, Input, InputNumber, Space, Switch } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { ToastManager } from '../common/ToastManager';
import { useEditorStore } from '../../stores/editorStore';
import type { RPGMap } from '../../types';

const countMapEvents = (mapData: RPGMap | null): number => {
  if (!mapData?.events || !Array.isArray(mapData.events)) return 0;
  return mapData.events.filter((entry) => !!entry).length;
};

const countTileEntries = (mapData: RPGMap | null): number => {
  if (!Array.isArray(mapData?.data)) return 0;
  return mapData.data.length;
};

export default function MapPanel() {
  const currentMapData = useEditorStore((state) => state.currentMapData);
  const currentMapId = useEditorStore((state) => state.currentMapId);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const updateCurrentMapData = useEditorStore((state) => state.updateCurrentMapData);
  const markFileDirty = useEditorStore((state) => state.markFileDirty);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!currentMapData) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      displayName: currentMapData.displayName || '',
      note: currentMapData.note || '',
      tilesetId: currentMapData.tilesetId ?? 0,
      scrollType: currentMapData.scrollType ?? 0,
      encounterStep: currentMapData.encounterStep ?? 30,
      disableDashing: !!currentMapData.disableDashing,
      autoplayBgm: !!currentMapData.autoplayBgm,
      autoplayBgs: !!currentMapData.autoplayBgs,
    });
  }, [currentMapData, form]);

  const handleSave = () => {
    if (!currentMapData) return;

    const values = form.getFieldsValue();
    const nextMapData: RPGMap = {
      ...currentMapData,
      displayName: values.displayName || '',
      note: values.note || '',
      tilesetId: Number(values.tilesetId || 0),
      scrollType: Number(values.scrollType || 0),
      encounterStep: Number(values.encounterStep || 0),
      disableDashing: !!values.disableDashing,
      autoplayBgm: !!values.autoplayBgm,
      autoplayBgs: !!values.autoplayBgs,
    };

    updateCurrentMapData(nextMapData);
    if (currentFilePath) {
      markFileDirty(currentFilePath);
    }
    ToastManager.success('地图数据已更新');
  };

  if (!currentMapData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900">
        <Empty
          description={
            <div className="text-center">
              <div className="text-5xl mb-4">🗺️</div>
              <div className="text-lg text-gray-300 mb-2">请选择地图</div>
              <div className="text-gray-500">左侧会先显示 `MapInfos.json` 提供的地图索引，点击后再按需加载具体地图。</div>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-dark-900">
      <Space direction="vertical" size={16} className="w-full">
        <Card
          title={`地图 #${currentMapId || 0}`}
          extra={(
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存地图信息
            </Button>
          )}
        >
          <Descriptions column={4} size="small" bordered>
            <Descriptions.Item label="宽度">{currentMapData.width ?? 0}</Descriptions.Item>
            <Descriptions.Item label="高度">{currentMapData.height ?? 0}</Descriptions.Item>
            <Descriptions.Item label="事件数">{countMapEvents(currentMapData)}</Descriptions.Item>
            <Descriptions.Item label="图块数">{countTileEntries(currentMapData)}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="基础信息">
          <Form form={form} layout="vertical">
            <Form.Item label="显示名称" name="displayName">
              <Input placeholder="地图显示名称" />
            </Form.Item>

            <Form.Item label="备注" name="note">
              <Input.TextArea rows={4} placeholder="地图备注" />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item label="图块集 ID" name="tilesetId">
                <InputNumber min={0} className="w-full" />
              </Form.Item>

              <Form.Item label="滚动类型" name="scrollType">
                <InputNumber min={0} className="w-full" />
              </Form.Item>

              <Form.Item label="遇敌步数" name="encounterStep">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item label="禁止奔跑" name="disableDashing" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item label="自动播放 BGM" name="autoplayBgm" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item label="自动播放 BGS" name="autoplayBgs" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
          </Form>
        </Card>
      </Space>
    </div>
  );
}

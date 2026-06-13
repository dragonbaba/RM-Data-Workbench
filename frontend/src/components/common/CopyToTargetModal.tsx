import { useEffect, useState } from 'react';
import { Modal, Select } from 'antd';
import { ToastManager } from './ToastManager';

export interface CopyToTargetOption {
  value: number;
  label: string;
}

interface CopyToTargetModalProps {
  open: boolean;
  title: string;
  description?: string;
  options: CopyToTargetOption[];
  onConfirm: (selectedIndexes: number[]) => void;
  onCancel: () => void;
}

/**
 * 跨条目数据复制弹窗。
 * 用于装备/改造/属性模式将当前条目的数据批量复制到其它目标条目。
 */
export function CopyToTargetModal({
  open,
  title,
  description,
  options,
  onConfirm,
  onCancel,
}: CopyToTargetModalProps) {
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setSelected([]);
    }
  }, [open]);

  const handleOk = () => {
    if (selected.length === 0) {
      ToastManager.warning('请至少选择一个目标');
      return;
    }
    onConfirm([...selected].sort((a, b) => a - b));
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="复制到所选目标"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      {description ? (
        <p className="text-sm text-gray-400 mb-3">{description}</p>
      ) : null}
      <Select
        mode="multiple"
        value={selected}
        onChange={(values: number[]) => setSelected(values)}
        options={options}
        showSearch
        optionFilterProp="label"
        placeholder="选择目标（可多选，会覆盖目标原有数据）"
        className="w-full"
        maxTagCount="responsive"
      />
    </Modal>
  );
}

export default CopyToTargetModal;

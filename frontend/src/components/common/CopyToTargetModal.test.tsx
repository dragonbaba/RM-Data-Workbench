import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopyToTargetModal } from './CopyToTargetModal';

describe('CopyToTargetModal', () => {
  const options = [
    { value: 2, label: '2 : 角色B' },
    { value: 3, label: '3 : 角色C' },
  ];

  it('open 时渲染标题和描述文案', () => {
    render(
      <CopyToTargetModal
        open
        title="复制装备槽"
        description="覆盖目标数据"
        options={options}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('复制装备槽')).toBeTruthy();
    expect(screen.getByText('覆盖目标数据')).toBeTruthy();
  });

  it('未选择目标时点击确定不触发 onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <CopyToTargetModal
        open
        title="复制装备槽"
        options={options}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('复制到所选目标'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

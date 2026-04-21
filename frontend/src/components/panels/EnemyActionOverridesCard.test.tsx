import { render, screen, waitFor } from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it } from 'vitest';
import { EnemyActionOverridesCard } from './EnemyActionOverridesCard';

const createEnemy = () => ({
  id: 1,
  name: '散射炮台',
  actions: [
    {
      skillId: 10,
      rating: 5,
      conditionType: 0,
      conditionParam1: 0,
      conditionParam2: 0,
    },
  ],
});

const createSkillsData = () => {
  const skills = new Array(11).fill(null);
  skills[10] = { id: 10, name: '散射炮' };
  return skills;
};

const createOverrideValues = () => ({
  actionOverrides: {
    '10': {
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 2,
      shapeType: 2,
      areaTargetCount: 2,
      repeatTime: 1,
      repeatTimeFloat: 0,
      actionRepeat: 1,
      shapeParams: {
        1: { radius: 120 },
        2: { radius: 900, angleDeg: 20 },
        3: { width: 80, length: 240 },
      },
    },
  },
});

describe('EnemyActionOverridesCard', () => {
  it('已存在扇形覆盖时不会在初始化阶段改回圆形', async () => {
    let capturedForm: ReturnType<typeof Form.useForm>[0] | null = null;

    const Wrapper = () => {
      const [form] = Form.useForm();
      capturedForm = form;
      return (
        <Form form={form} initialValues={createOverrideValues()}>
          <EnemyActionOverridesCard
            enemy={createEnemy() as never}
            skillsData={createSkillsData()}
            fieldKey="actionOverrides"
          />
        </Form>
      );
    };

    render(<Wrapper />);

    await screen.findByText('扇形角度');
    expect(screen.getByText('扇形半径')).toBeInTheDocument();
    expect(screen.queryByText('圆形半径')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(capturedForm?.getFieldValue(['actionOverrides', '10', 'shapeType'])).toBe(2);
      expect(capturedForm?.getFieldValue(['actionOverrides', '10', 'areaTargetCount'])).toBe(2);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { buildQuestDependencySummary } from './QuestDependencyService';
import type { RPGQuest } from '../types';

const createQuest = (title: string, id?: number): RPGQuest => ({
  id,
  title,
  giver: 'NPC',
  category: true,
  repeatable: false,
  difficulty: 1,
  description: [],
  requirements: [],
  objectives: [],
  rewards: [],
  startSwitches: [],
  switches: [],
  startVariables: [],
  variables: [],
});

describe('QuestDependencyService', () => {
  it('识别缺失前置任务引用', () => {
    const q1 = createQuest('任务A', 1);
    q1.requirements = [{ type: 2, questId: 99 }];
    const data = [null, q1] as (RPGQuest | null)[];

    const summary = buildQuestDependencySummary(data, 1);
    expect(summary.issues.some((issue) => issue.type === 'missing' && issue.targetQuestId === 99)).toBe(true);
    expect(summary.directPrerequisites[0].missing).toBe(true);
  });

  it('识别自引用与环依赖', () => {
    const q1 = createQuest('任务A', 1);
    const q2 = createQuest('任务B', 2);
    q1.requirements = [{ type: 2, questId: 1 }];
    q2.requirements = [{ type: 2, questId: 1 }];
    q1.requirements.push({ type: 2, questId: 2 });
    const data = [null, q1, q2] as (RPGQuest | null)[];

    const summary = buildQuestDependencySummary(data, 1);
    expect(summary.issues.some((issue) => issue.type === 'self' && issue.questIndex === 1)).toBe(true);
    expect(summary.issues.some((issue) => issue.type === 'cycle')).toBe(true);
  });

  it('计算直接前置/后继与传递计数', () => {
    const q1 = createQuest('任务1', 1);
    const q2 = createQuest('任务2', 2);
    const q3 = createQuest('任务3', 3);
    q2.requirements = [{ type: 2, questId: 1 }];
    q3.requirements = [{ type: 2, questId: 2 }];
    const data = [null, q1, q2, q3] as (RPGQuest | null)[];

    const summary = buildQuestDependencySummary(data, 2);
    expect(summary.directPrerequisites.map((item) => item.index)).toEqual([1]);
    expect(summary.directDependents.map((item) => item.index)).toEqual([3]);
    expect(summary.transitivePrerequisiteCount).toBe(1);
    expect(summary.transitiveDependentCount).toBe(1);
  });
});


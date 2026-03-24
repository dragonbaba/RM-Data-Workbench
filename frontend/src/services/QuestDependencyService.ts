import type { RPGQuest } from '../types';

export type QuestDependencyIssueType = 'missing' | 'self' | 'cycle';

export interface QuestDependencyIssue {
  type: QuestDependencyIssueType;
  questIndex: number;
  questTitle: string;
  targetQuestId?: number;
  path?: number[];
}

export interface QuestChainNode {
  index: number;
  id?: number;
  title: string;
  viaQuestId?: number;
  missing?: boolean;
}

export interface QuestDependencySummary {
  issues: QuestDependencyIssue[];
  directPrerequisites: QuestChainNode[];
  directDependents: QuestChainNode[];
  transitivePrerequisiteCount: number;
  transitiveDependentCount: number;
}

interface QuestEntry {
  index: number;
  quest: RPGQuest;
}

const getQuestTitle = (quest: RPGQuest | null | undefined, index: number): string => {
  return quest?.title?.trim() ? quest.title.trim() : `任务${index}`;
};

const getQuestEntries = (data: (RPGQuest | null)[] | null): QuestEntry[] => {
  if (!Array.isArray(data)) return [];
  const result: QuestEntry[] = [];
  for (let index = 1; index < data.length; index += 1) {
    const quest = data[index];
    if (quest && typeof quest === 'object') {
      result.push({ index, quest });
    }
  }
  return result;
};

const resolveQuestIndex = (
  questId: number,
  data: (RPGQuest | null)[] | null,
  indexById: Map<number, number>,
): number | null => {
  if (indexById.has(questId)) {
    return indexById.get(questId) ?? null;
  }
  if (Array.isArray(data) && questId > 0 && questId < data.length && data[questId]) {
    return questId;
  }
  return null;
};

const buildDependencyGraph = (data: (RPGQuest | null)[] | null) => {
  const entries = getQuestEntries(data);
  const entryByIndex = new Map<number, QuestEntry>();
  const indexById = new Map<number, number>();
  const adjacency = new Map<number, Set<number>>();
  const issues: QuestDependencyIssue[] = [];

  entries.forEach((entry) => {
    entryByIndex.set(entry.index, entry);
    adjacency.set(entry.index, new Set<number>());
    if (Number.isInteger(entry.quest.id) && (entry.quest.id as number) > 0) {
      indexById.set(entry.quest.id as number, entry.index);
    }
  });

  entries.forEach((entry) => {
    const requirements = Array.isArray(entry.quest.requirements) ? entry.quest.requirements : [];
    requirements.forEach((requirement) => {
      if (Number(requirement?.type) !== 2) return;
      const questId = Number(requirement?.questId || 0);
      if (!Number.isFinite(questId) || questId <= 0) return;

      const targetIndex = resolveQuestIndex(questId, data, indexById);
      if (targetIndex === null) {
        issues.push({
          type: 'missing',
          questIndex: entry.index,
          questTitle: getQuestTitle(entry.quest, entry.index),
          targetQuestId: questId,
        });
        return;
      }

      if (targetIndex === entry.index) {
        issues.push({
          type: 'self',
          questIndex: entry.index,
          questTitle: getQuestTitle(entry.quest, entry.index),
          targetQuestId: questId,
        });
      }

      adjacency.get(entry.index)?.add(targetIndex);
    });
  });

  return { entries, entryByIndex, adjacency, issues };
};

const detectCycleIssues = (
  adjacency: Map<number, Set<number>>,
  entryByIndex: Map<number, QuestEntry>,
): QuestDependencyIssue[] => {
  const cycleIssues: QuestDependencyIssue[] = [];
  const visited = new Set<number>();
  const visiting = new Set<number>();
  const cycleSignatures = new Set<string>();
  const stack: number[] = [];

  const dfs = (node: number) => {
    visiting.add(node);
    stack.push(node);

    const neighbors = adjacency.get(node) ?? new Set<number>();
    neighbors.forEach((next) => {
      if (!visited.has(next)) {
        if (visiting.has(next)) {
          const cycleStart = stack.indexOf(next);
          const path = cycleStart >= 0 ? [...stack.slice(cycleStart), next] : [next, next];
          const signature = path.join('>');
          if (!cycleSignatures.has(signature)) {
            cycleSignatures.add(signature);
            const entry = entryByIndex.get(node);
            cycleIssues.push({
              type: 'cycle',
              questIndex: node,
              questTitle: getQuestTitle(entry?.quest, node),
              path,
            });
          }
          return;
        }
        dfs(next);
      }
    });

    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };

  adjacency.forEach((_edges, node) => {
    if (!visited.has(node)) {
      dfs(node);
    }
  });

  return cycleIssues;
};

const uniqueNodes = (nodes: QuestChainNode[]): QuestChainNode[] => {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key = `${node.index}-${node.viaQuestId ?? ''}-${node.missing ? 'm' : 'ok'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const countReachable = (start: number, graph: Map<number, Set<number>>): number => {
  const visited = new Set<number>();
  const queue: number[] = [...(graph.get(start) ? Array.from(graph.get(start) as Set<number>) : [])];
  while (queue.length > 0) {
    const current = queue.shift() as number;
    if (visited.has(current)) continue;
    visited.add(current);
    const next = graph.get(current);
    if (!next) continue;
    next.forEach((target) => {
      if (!visited.has(target)) {
        queue.push(target);
      }
    });
  }
  return visited.size;
};

export const buildQuestDependencySummary = (
  data: (RPGQuest | null)[] | null,
  currentIndex: number,
): QuestDependencySummary => {
  const { entries, entryByIndex, adjacency, issues } = buildDependencyGraph(data);
  const cycleIssues = detectCycleIssues(adjacency, entryByIndex);
  const allIssues = [...issues, ...cycleIssues];

  if (!entries.length || currentIndex <= 0 || !entryByIndex.has(currentIndex)) {
    return {
      issues: allIssues,
      directPrerequisites: [],
      directDependents: [],
      transitivePrerequisiteCount: 0,
      transitiveDependentCount: 0,
    };
  }

  const reverseGraph = new Map<number, Set<number>>();
  adjacency.forEach((targets, source) => {
    targets.forEach((target) => {
      if (!reverseGraph.has(target)) {
        reverseGraph.set(target, new Set<number>());
      }
      reverseGraph.get(target)?.add(source);
    });
  });

  const prerequisites: QuestChainNode[] = [];
  const currentQuest = entryByIndex.get(currentIndex)?.quest;
  const requirements = Array.isArray(currentQuest?.requirements) ? currentQuest?.requirements : [];
  const indexById = new Map<number, number>();
  entries.forEach((entry) => {
    if (Number.isInteger(entry.quest.id) && (entry.quest.id as number) > 0) {
      indexById.set(entry.quest.id as number, entry.index);
    }
  });

  requirements.forEach((requirement) => {
    if (Number(requirement?.type) !== 2) return;
    const questId = Number(requirement?.questId || 0);
    if (!Number.isFinite(questId) || questId <= 0) return;
    const targetIndex = resolveQuestIndex(questId, data, indexById);
    if (targetIndex === null) {
      prerequisites.push({
        index: -1,
        title: `缺失任务 #${questId}`,
        viaQuestId: questId,
        missing: true,
      });
      return;
    }
    const targetQuest = entryByIndex.get(targetIndex)?.quest;
    prerequisites.push({
      index: targetIndex,
      id: targetQuest?.id,
      title: getQuestTitle(targetQuest, targetIndex),
      viaQuestId: questId,
    });
  });

  const dependents: QuestChainNode[] = [];
  const directDependents = reverseGraph.get(currentIndex) ?? new Set<number>();
  directDependents.forEach((dependentIndex) => {
    const dependentQuest = entryByIndex.get(dependentIndex)?.quest;
    dependents.push({
      index: dependentIndex,
      id: dependentQuest?.id,
      title: getQuestTitle(dependentQuest, dependentIndex),
    });
  });

  return {
    issues: allIssues,
    directPrerequisites: uniqueNodes(prerequisites),
    directDependents: uniqueNodes(dependents),
    transitivePrerequisiteCount: countReachable(currentIndex, adjacency),
    transitiveDependentCount: countReachable(currentIndex, reverseGraph),
  };
};


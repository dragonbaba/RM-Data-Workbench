import { describe, expect, it } from 'vitest';
import {
  buildDataReloadBatchConfirmMessage,
  buildDataReloadConfirmMessage,
  normalizeDataPathKey,
  resolveDataChangeBatch,
  resolveDataChangeImpact,
} from './BaseDataReloadService';

describe('BaseDataReloadService', () => {
  it('当前文件发生外部变化时需要确认并重载当前文件', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'property',
      currentFilePath: 'D:/Project/data/Actors.json',
      currentMapId: null,
    }, {
      filePath: 'D:\\Project\\data\\Actors.json',
      fileName: 'Actors.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'current-file',
    });
  });

  it('任务面板依赖文件变化时需要确认但不切换当前文件', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'quest',
      currentFilePath: 'D:/Project/data/Quests.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/Items.json',
      fileName: 'Items.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('武器属性面板依赖 EquipExtensions 时需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'property',
      currentFilePath: 'D:/Project/data/Weapons.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/EquipExtensions.json',
      fileName: 'EquipExtensions.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('武器属性面板依赖 Skills 时需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'property',
      currentFilePath: 'D:/Project/data/Weapons.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/Skills.json',
      fileName: 'Skills.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('非当前激活面板的普通基础数据变化时静默刷新缓存', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'property',
      currentFilePath: 'D:/Project/data/Actors.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/Enemies.json',
      fileName: 'Enemies.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: false,
      target: 'dependency',
    });
  });

  it('地图索引视图命中 MapInfos 时需要确认后刷新列表', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'map',
      currentFilePath: '',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/MapInfos.json',
      fileName: 'MapInfos.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'map-browser',
    });
  });

  it('装备模式依赖扩展文件变化时需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'equip',
      currentFilePath: 'D:/Project/data/Actors.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/EquipExtensions.json',
      fileName: 'EquipExtensions.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('掉落模式命中 Items.json 时需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'drop',
      currentFilePath: 'D:/Project/data/Enemies.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/Items.json',
      fileName: 'Items.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('掉落模式命中 Weapons.json 时需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'drop',
      currentFilePath: 'D:/Project/data/Enemies.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/Weapons.json',
      fileName: 'Weapons.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('弹道模式命中 Animations.json 时需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'projectile',
      currentFilePath: 'D:/Project/data/Projectiles.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/Animations.json',
      fileName: 'Animations.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('弹道模式命中小写 animations.json 时也需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'projectile',
      currentFilePath: 'd:/project/data/projectiles.json',
      currentMapId: null,
    }, {
      filePath: 'd:/project/data/animations.json',
      fileName: 'animations.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('小写 weapons.json 命中属性依赖时也需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'property',
      currentFilePath: 'd:/project/data/weapons.json',
      currentMapId: null,
    }, {
      filePath: 'd:/project/data/skills.json',
      fileName: 'skills.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('技能属性面板依赖 Projectiles.json 时需要确认刷新', () => {
    const impact = resolveDataChangeImpact({
      uiMode: 'property',
      currentFilePath: 'D:/Project/data/Skills.json',
      currentMapId: null,
    }, {
      filePath: 'D:/Project/data/Projectiles.json',
      fileName: 'Projectiles.json',
      changeType: 'write',
    });

    expect(impact).toEqual({
      shouldReload: true,
      shouldConfirm: true,
      target: 'dependency',
    });
  });

  it('弹道模式依赖文件变化时使用专用重载提示文案', () => {
    const snapshot = {
      uiMode: 'projectile' as const,
      currentFilePath: 'D:/Project/data/Projectiles.json',
      currentMapId: null,
    };
    const impact = resolveDataChangeImpact(snapshot, {
      filePath: 'D:/Project/data/Animations.json',
      fileName: 'Animations.json',
      changeType: 'write',
    });

    expect(buildDataReloadConfirmMessage(snapshot, impact, 'Animations.json', false)).toBe(
      '当前弹道面板依赖的 Animations.json 已发生变化，重新加载后会同步刷新动画与引用选项。是否立即重新加载？',
    );
  });

  it('技能属性面板依赖弹道文件变化时使用专用提示文案', () => {
    const snapshot = {
      uiMode: 'property' as const,
      currentFilePath: 'D:/Project/data/Skills.json',
      currentMapId: null,
    };
    const impact = resolveDataChangeImpact(snapshot, {
      filePath: 'D:/Project/data/Projectiles.json',
      fileName: 'Projectiles.json',
      changeType: 'write',
    });

    expect(buildDataReloadConfirmMessage(snapshot, impact, 'Projectiles.json', false)).toBe(
      '当前技能面板依赖的 Projectiles.json 已发生变化，重新加载后会同步刷新“挂接弹道”选项。是否立即重新加载？',
    );
  });

  it('当前文件存在未保存修改时优先提示覆盖风险', () => {
    const snapshot = {
      uiMode: 'property' as const,
      currentFilePath: 'D:/Project/data/Actors.json',
      currentMapId: null,
    };
    const impact = resolveDataChangeImpact(snapshot, {
      filePath: 'D:/Project/data/Actors.json',
      fileName: 'Actors.json',
      changeType: 'write',
    });

    expect(buildDataReloadConfirmMessage(snapshot, impact, 'Actors.json', true)).toBe(
      '当前正在使用的 Actors.json 已发生变化，重新加载会覆盖未保存修改。是否继续？',
    );
  });

  it('标准化路径键时统一斜杠与盘符大小写', () => {
    expect(normalizeDataPathKey('D:\\Project\\data\\Actors.json')).toBe('d:/project/data/actors.json');
  });

  it('会将同一批外部依赖变更聚合为一次确认计划', () => {
    const plan = resolveDataChangeBatch({
      uiMode: 'projectile',
      currentFilePath: 'D:/Project/data/Projectiles.json',
      currentMapId: null,
    }, [
      {
        filePath: 'D:/Project/data/Animations.json',
        fileName: 'Animations.json',
        changeType: 'write',
      },
      {
        filePath: 'D:/Project/data/Weapons.json',
        fileName: 'Weapons.json',
        changeType: 'write',
      },
    ]);

    expect(plan.shouldConfirm).toBe(true);
    expect(plan.shouldReloadCurrentSelection).toBe(true);
    expect(plan.affectsCurrentFile).toBe(false);
    expect(plan.entries.map((entry) => entry.fileName)).toEqual(['Animations.json', 'Weapons.json']);
  });

  it('批量确认文案会列出全部变更文件', () => {
    const snapshot = {
      uiMode: 'projectile' as const,
      currentFilePath: 'D:/Project/data/Projectiles.json',
      currentMapId: null,
    };
    const plan = resolveDataChangeBatch(snapshot, [
      {
        filePath: 'D:/Project/data/Animations.json',
        fileName: 'Animations.json',
        changeType: 'write',
      },
      {
        filePath: 'D:/Project/data/Weapons.json',
        fileName: 'Weapons.json',
        changeType: 'write',
      },
    ]);

    expect(buildDataReloadBatchConfirmMessage(snapshot, plan, false)).toBe(
      [
        '当前弹道面板依赖的多个文件发生了外部变化。确认后将统一重新加载一次当前编辑上下文。',
        '',
        '变更文件：',
        '- Animations.json',
        '- Weapons.json',
      ].join('\n'),
    );
  });
});

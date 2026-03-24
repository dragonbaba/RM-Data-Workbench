import { describe, expect, it } from 'vitest';
import { normalizeDataPathKey, resolveDataChangeImpact } from './BaseDataReloadService';

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

  it('标准化路径键时统一斜杠与盘符大小写', () => {
    expect(normalizeDataPathKey('D:\\Project\\data\\Actors.json')).toBe('d:/project/data/actors.json');
  });
});

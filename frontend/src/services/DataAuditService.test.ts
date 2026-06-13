import { describe, expect, it, vi } from 'vitest';
import { auditAndRepairDataFiles, toAuditSummaryText } from './DataAuditService';

const createDefaultOwnerParams = (elementCount = 2) => ({
  baseParams: [0, 0, 0, 0, 0, 0, 0, 0],
  paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
  extraParams: [0, 0, 0, 0, 0, 0],
  specialParams: [0, 0, 0, 0, 0, 0],
  scalar: [0, 0],
  elementRate: new Array(elementCount).fill(0),
});

const createDefaultThrowProjectileOffset = () => ({
  13: { x: -36, y: -23 },
});

const createDefaultClassParams = (value = 0) => new Array(8).fill(null).map(() => new Array(100).fill(value));

describe('DataAuditService', () => {
  it('会批量修复目标数据并返回摘要', async () => {
    const writes: Array<{ filePath: string; data: unknown }> = [];
    const files = new Map<string, unknown>([
      ['D:/Project/data/System.json', {
        elements: ['', '通常', '火炎'],
        weaponTypes: ['', '主炮', '副炮', 'SE', '人类通用武器', '猎人武器', '机械师武器', '战士武器', '摔跤手武器', '护士武器', '实验体改造人武器', '艺术家武器', '波奇武器'],
      }],
      ['D:/Project/data/Actors.json', [null, {
        id: 1,
        name: '主角',
        description: '第一行\n第二行',
        effects: [],
      }]],
      ['D:/Project/data/Classes.json', [null, {
        id: 1,
        name: '猎人',
        effects: [],
        params: [0, 1, 2, 3, 4, 5, 6, 7],
        floatParams: [1, 2, 3],
      }]],
      ['D:/Project/data/Skills.json', [
        null,
        {
          id: 1,
          name: '火球',
          params: [1, 2, 3, 4, 5, 6, 7, 8],
          floatParams: [0.1, 0.2, 0.3],
          extraParams: [{ value: 1 }],
          projectileId: 7,
          skillProjectileTag: 1,
          meta: {
            lilmits: 3,
            needTargetSelect: true,
            needWeaponSelect: true,
          },
          note: '<lilmits:3>\n<needTargetSelect:true>\n<needWeaponSelect:true>',
          skillCosts: [
            { type: 'item', itemId: 2 },
          ],
          skillEffectSpec: {
            durabilityChange: {
              mode: 'reduce',
              value: 6,
            },
            skillDurability: {
              baseLoss: 4,
              halfBrokenRate: 35,
            },
          },
        },
      ]],
      ['D:/Project/data/States.json', [
        null,
        {
          id: 1,
          name: '蓄力',
          params: [8, 7, 6, 5, 4, 3, 2, 1],
          floatParams: [0.5, 0.4],
          effects: [],
          chargeConfig: {
            blockActions: true,
            releaseSkillId: 6,
          },
        },
        {
          id: 2,
          name: '空蓄力',
        },
      ]],
      ['D:/Project/data/Items.json', [
        null,
        {
          id: 1,
          name: '手雷',
          params: [3, 3, 3, 3, 3, 3, 3, 3],
          floatParams: [0.3, 0.2],
          projectileId: 5,
          skillProjectileTag: 1,
          targetCamp: 2,
          areaMode: 2,
          areaTargetCount: 3,
          repeatTime: 2,
          damage: {
            type: 1,
            elementId: 2,
            variance: 8,
          },
        },
      ]],
      ['D:/Project/data/Enemies.json', [
        null,
        {
          id: 1,
          name: '炮台',
          reactionSkillId: 9,
          floatParams: [0.5, 0.4, 0.3],
          actions: [
            { skillId: 1, rating: 5, conditionType: 0, conditionParam1: 0, conditionParam2: 0 },
          ],
        },
      ]],
      ['D:/Project/data/Weapons.json', [
        null,
        { id: 1, name: '主炮', qualityLevel: 99 },
      ]],
      ['D:/Project/data/EquipExtensions.json', {
        weaponEquipTypes: [null, 'bad'],
        systemWeaponEquipTypes: [10, 10],
        actorEquipSlots: [null, [10]],
        actorEquips: [null, [1]],
        actorRefitRules: [null, {
          slots: [{
            slotIndex: 0,
            fromEquipTypeId: 10,
            transitions: [{
              fromEquipTypeId: 10,
              toEquipTypeId: 11,
              goldCost: 100,
              conditions: [{ kind: 'none' }],
            }],
          }],
        }],
      }],
      ['D:/Project/data/Armors.json', [
        null,
        { id: 1, name: '测试C装', etypeId: 8, hiddenAttackSkillId: 17, effects: [1], qualityLevel: -2 },
        { id: 2, name: '测试底盘', etypeId: 9, hiddenAttackSkillId: 23 },
      ]],
      ['D:/Project/data/Projectiles.json', [
        null,
        {
          id: 1,
          name: '旧弹道',
          sourceType: '角色',
          sourceId: 1,
          targetType: '敌人',
          targetId: 1,
          weaponId: 1,
          skillId: 1,
          launchAnimation: {
            animationId: 3,
            segments: [
              { targetX: 12, targetY: -20, duration: 0, easing: 'easeOutQuad' },
            ],
          },
        },
      ]],
      ['D:/Project/data/Troops.json', [null]],
      ['D:/Project/data/Effects.json', [
        null,
        {
          id: 1,
          name: '经验增益',
          effectType: 'owner_scalar_bonus',
          isStatic: true,
          config: {
            selector: {},
            args: {
              ops: [{ group: 'scalar', key: 'expRate', op: 'add', value: 0.1 }],
            },
          },
        },
      ]],
    ]);

    const summary = await auditAndRepairDataFiles('D:/Project/data', {
      readJson: vi.fn(async (filePath: string) => files.get(filePath)),
      writeJson: vi.fn(async (filePath: string, data: unknown) => {
        writes.push({ filePath, data: JSON.parse(JSON.stringify(data)) });
        return null;
      }),
    });

    expect(summary.checkedFiles).toBe(12);
    expect(summary.repairedFiles).toBe(11);
    expect(summary.repairedEntries).toBe(12);
    expect(writes).toHaveLength(11);

    const actorPayload = writes.find((item) => item.filePath.endsWith('Actors.json'))?.data as unknown[];
    expect(actorPayload[1]).toMatchObject({
      id: 1,
      description: ['第一行', '第二行'],
      projectileOffset: createDefaultThrowProjectileOffset(),
      ownerParams: createDefaultOwnerParams(3),
      passiveStates: [],
      isStaticImage: false,
      isTank: false,
    });

    const classPayload = writes.find((item) => item.filePath.endsWith('Classes.json'))?.data as unknown[];
    expect(classPayload[1]).toMatchObject({
      id: 1,
      ownerParams: createDefaultOwnerParams(3),
      passiveStates: [],
    });
    expect((classPayload[1] as any).params).toEqual([
      new Array(100).fill(0),
      new Array(100).fill(1),
      new Array(100).fill(2),
      new Array(100).fill(3),
      new Array(100).fill(4),
      new Array(100).fill(5),
      new Array(100).fill(6),
      new Array(100).fill(7),
    ]);
    expect(classPayload[1]).not.toHaveProperty('floatParams');

    const skillPayload = writes.find((item) => item.filePath.endsWith('Skills.json'))?.data as unknown[];

    expect(skillPayload[1]).toMatchObject({
      projectileId: 7,
      skillProjectileTag: 1,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      actionSequenceType: 1,
      actionSequenceScriptKey: '',
      targetType: 0,
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
      repeatTime: 1,
      repeatTimeFloat: 0,
      skillEffectSpec: {
        damage: {
          damageType: 'none',
          damageElementId: 0,
          allowCritical: false,
          damageScatter: 0,
          formula: {
            mode: 'basic',
            scriptKey: '',
          },
        },
        durabilityChange: {
          mode: 'reduce',
          value: 6,
        },
        skillDurability: {
          halfBrokenSkipRate: 35,
        },
      },
      limits: 3,
      needTargetSelect: true,
      needWeaponSelect: true,
    });
    expect((skillPayload[1] as any).note).toBe('');
    expect((skillPayload[1] as any).meta).toBeUndefined();
    expect((skillPayload[1] as any).skillCosts[0]).toEqual({
      type: 'item',
      value: 0,
      variableId: 0,
      itemId: 2,
      weaponId: 0,
      armorId: 0,
      amount: 1,
    });
    expect(skillPayload[1]).not.toHaveProperty('isUsedForProjectile');
    expect(skillPayload[1]).not.toHaveProperty('damage');
    expect(skillPayload[1]).not.toHaveProperty('params');
    expect(skillPayload[1]).not.toHaveProperty('floatParams');
    expect(skillPayload[1]).not.toHaveProperty('extraParams');
    const normalizedSkillDurability = (skillPayload[1] as {
      skillEffectSpec: { skillDurability: Record<string, unknown> };
    }).skillEffectSpec.skillDurability;
    expect(normalizedSkillDurability).not.toHaveProperty('baseLoss');
    expect(normalizedSkillDurability).not.toHaveProperty('halfBrokenRate');

    const statePayload = writes.find((item) => item.filePath.endsWith('States.json'))?.data as unknown[];
    expect(statePayload[1]).toMatchObject({
      id: 1,
      name: '蓄力',
      chargeConfig: {
        blockActions: true,
        grantAction: false,
        releaseSkillId: 6,
        queueScope: 0,
        queueShift: 0,
      },
    });
    expect(statePayload[2]).toMatchObject({
      id: 2,
      name: '空蓄力',
      chargeConfig: {
        blockActions: false,
        grantAction: false,
        releaseSkillId: 0,
        queueScope: 0,
        queueShift: 0,
      },
      ownerParams: createDefaultOwnerParams(3),
    });
    expect(statePayload[1]).not.toHaveProperty('params');
    expect(statePayload[1]).not.toHaveProperty('floatParams');

    const itemPayload = writes.find((item) => item.filePath.endsWith('Items.json'))?.data as unknown[];
    expect(itemPayload[1]).toMatchObject({
      projectileId: 5,
      skillProjectileTag: 1,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      actionSequenceType: 2,
      actionSequenceScriptKey: '',
      targetType: 0,
      targetCamp: 2,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 2,
      shapeType: 1,
      areaTargetCount: 3,
      repeatTime: 2,
      repeatTimeFloat: 0,
      skillEffectSpec: {
        damage: {
          damageType: 'none',
          damageElementId: 0,
          allowCritical: false,
          damageScatter: 0,
          formula: {
            mode: 'basic',
            scriptKey: '',
          },
        },
        durabilityChange: {
          mode: 'none',
          value: 0,
        },
        skillDurability: {
          halfBrokenSkipRate: 50,
        },
      },
    });
    expect(itemPayload[1]).not.toHaveProperty('damage');
    expect(itemPayload[1]).not.toHaveProperty('params');
    expect(itemPayload[1]).not.toHaveProperty('floatParams');

    const enemyPayload = writes.find((item) => item.filePath.endsWith('Enemies.json'))?.data as unknown[];
    expect(enemyPayload[1]).toMatchObject({
      classId: 1,
      level: 1,
      canReaction: true,
      reactionSkillId: 9,
      ownerParams: createDefaultOwnerParams(3),
      passiveStates: [],
      actionOverrides: {
        1: {
          targetCamp: 1,
          targetLifeState: 1,
          selectMode: 1,
          areaMode: 1,
          shapeType: 0,
          areaTargetCount: 0,
          repeatTime: 1,
          repeatTimeFloat: 0,
          actionRepeat: 1,
          allowSkillBreak: true,
        },
      },
    });
    expect(enemyPayload[1]).not.toHaveProperty('floatParams');

    const weaponPayload = writes.find((item) => item.filePath.endsWith('Weapons.json'))?.data as unknown[];
    expect(weaponPayload[1]).toMatchObject({
      id: 1,
      weaponImageId: 1,
      qualityLock: false,
      qualityLevel: 6,
      ownerParams: {
        extraParams: [0, 0, 0, 0, 0, 0],
        scalar: [0, 0],
        specialParams: [0, 0, 0, 0, 0, 0],
      },
      passiveStates: [],
      upgradeCosts: [],
    });

    const armorPayload = writes.find((item) => item.filePath.endsWith('Armors.json'))?.data as unknown[];
    expect(armorPayload[1]).toMatchObject({
      etypeId: 8,
      hiddenAttackSkillId: 17,
      qualityLock: false,
      qualityLevel: 0,
      effects: [],
      passiveStates: [],
      upgradeCosts: [],
      ownerParams: {
        scalar: [0.1, 0],
      },
    });
    expect(armorPayload[2]).toMatchObject({
      etypeId: 9,
      hiddenAttackSkillId: 23,
      qualityLock: false,
      qualityLevel: 0,
      ownerParams: {
        extraParams: [0, 0, 0, 0, 0, 0],
        scalar: [0, 0],
        specialParams: [0, 0, 0, 0, 0, 0],
      },
      passiveStates: [],
      upgradeCosts: [],
    });

    const projectilePayload = writes.find((item) => item.filePath.endsWith('Projectiles.json'))?.data as unknown[];
    expect(projectilePayload[1]).toMatchObject({
      launchAnimation: {
        animationId: 3,
      },
    });
    expect(projectilePayload[1]).not.toHaveProperty('sourceType');
    expect(projectilePayload[1]).not.toHaveProperty('sourceId');
    expect(projectilePayload[1]).not.toHaveProperty('targetType');
    expect(projectilePayload[1]).not.toHaveProperty('targetId');
    expect(projectilePayload[1]).not.toHaveProperty('weaponId');
    expect(projectilePayload[1]).not.toHaveProperty('skillId');
    expect((projectilePayload[1] as any).launchAnimation.segments[0]).toMatchObject({
      duration: 1,
      easeX: 'easeOutQuad',
      easeY: 'easeOutQuad',
    });
    expect((projectilePayload[1] as any).launchAnimation.segments[0]).not.toHaveProperty('easing');

    const effectPayload = writes.find((item) => item.filePath.endsWith('Effects.json'))?.data as unknown[];
    expect(effectPayload[1]).toBeNull();

    expect(toAuditSummaryText(summary)).toContain('Skills.json 1 条');
    expect(toAuditSummaryText(summary)).toContain('Items.json 1 条');
    expect(toAuditSummaryText(summary)).toContain('Weapons.json 1 条');
    expect(toAuditSummaryText(summary)).toContain('Projectiles.json 1 条');
    expect(toAuditSummaryText(summary)).toContain('Effects.json 1 条');
  });

  it('没有差异时不会写回文件', async () => {
    const writeJson = vi.fn();
    const summary = await auditAndRepairDataFiles('D:/Project/data', {
      readJson: vi.fn(async (filePath: string) => {
        if (filePath.endsWith('System.json')) {
          return {
            elements: ['', '通常'],
            weaponTypes: ['', '主炮', '副炮', 'SE', '人类通用武器', '猎人武器', '机械师武器', '战士武器', '摔跤手武器', '护士武器', '实验体改造人武器', '艺术家武器', '波奇武器'],
          };
        }
        if (filePath.endsWith('Actors.json')) {
          return [null, {
            id: 1,
            name: '主角',
            effects: [],
            projectileOffset: createDefaultThrowProjectileOffset(),
            ownerParams: createDefaultOwnerParams(),
            passiveStates: [],
            isStaticImage: false,
            isTank: false,
          }];
        }
        if (filePath.endsWith('Classes.json')) {
          return [null, {
            id: 1,
            name: '猎人',
            effects: [],
            params: createDefaultClassParams(),
            ownerParams: createDefaultOwnerParams(),
            passiveStates: [],
          }];
        }
        if (filePath.endsWith('Projectiles.json')) {
          return [null, {
            id: 1,
            name: '已规范弹道',
            startAnimationId: 0,
            launchAnimation: {
              animationId: 0,
              segments: [
                {
                  targetX: 0,
                  targetY: -120,
                  duration: 60,
                  easeX: 'linear',
                  easeY: 'linear',
                },
              ],
            },
            endAnimationId: 0,
          }];
        }
        if (filePath.endsWith('Effects.json')) {
          return [null, {
            id: 1,
            name: '单引擎奖励',
            description: ['载重 +3000'],
            effectType: 'single_engine_bonus',
            isStatic: true,
            config: {
              selector: {},
              args: {
                ops: [{ group: 'vehicleParams', key: 'loadValue', op: 'add', value: 3000 }],
                requiredCount: 0,
                weaponIds: [],
                armorIds: [],
              },
            },
          }];
        }
        if (filePath.endsWith('Items.json')) {
          return [null, {
            id: 1,
            name: '已规范手雷',
            projectileId: 0,
            skillProjectileTag: -1,
            reactionSuccessRate: 0,
            reactionPriority: 0,
            actionSequenceType: 3,
            actionSequenceScriptKey: '',
            weaponAction: {
              mode: 'none',
              countMin: 1,
              countMax: 1,
              maxCount: 8,
              ammoLimited: false,
              requireCanLaunch: false,
              durabilityLossMin: 0,
              durabilityLossMax: 0,
              friendStateId: 0,
            },
            targetType: 0,
            targetCamp: 2,
            targetLifeState: 1,
            selectMode: 1,
            areaMode: 2,
            shapeType: 1,
            areaTargetCount: 2,
            shapeParams: {
              1: { radius: 120 },
              2: { angleDeg: 60, radius: 180 },
              3: { length: 240, width: 80 },
            },
            repeatTime: 1,
            repeatTimeFloat: 0,
            skillEffectSpec: {
              damage: {
                damageType: 'none',
                damageElementId: 0,
                allowCritical: false,
                damageScatter: 0,
                formula: {
                  mode: 'basic',
                  scriptKey: '',
                },
              },
              durabilityChange: {
                mode: 'none',
                value: 0,
              },
              skillDurability: {
                halfBrokenSkipRate: 50,
              },
            },
          }];
        }
        if (filePath.endsWith('Skills.json')) {
          return [null, {
            id: 1,
            name: '已规范',
            projectileId: 0,
            skillProjectileTag: -1,
            reactionSuccessRate: 0,
            reactionPriority: 0,
            actionSequenceType: 0,
            actionSequenceScriptKey: '',
            targetType: 0,
            limits: -1,
            needTargetSelect: false,
            needWeaponSelect: false,
            weaponAction: {
              mode: 'none',
              countMin: 1,
              countMax: 1,
              maxCount: 8,
              ammoLimited: false,
              requireCanLaunch: false,
              durabilityLossMin: 0,
              durabilityLossMax: 0,
              friendStateId: 0,
            },
            skillCosts: [],
            skillEffectSpec: {
              damage: {
                damageType: 'none',
                damageElementId: 0,
                allowCritical: false,
                damageScatter: 0,
                formula: {
                  mode: 'basic',
                  scriptKey: '',
                },
              },
              durabilityChange: {
                mode: 'none',
                value: 0,
              },
              skillDurability: {
                halfBrokenSkipRate: 50,
              },
            },
            targetCamp: 1,
            targetLifeState: 1,
            selectMode: 1,
            areaMode: 1,
            shapeType: 0,
            areaTargetCount: 0,
            shapeParams: {
              1: { radius: 120 },
              2: { angleDeg: 60, radius: 180 },
              3: { length: 240, width: 80 },
            },
            repeatTime: 1,
            repeatTimeFloat: 0,
          }];
        }
        if (filePath.endsWith('Enemies.json')) {
          return [null, {
            id: 1,
            name: '已规范敌人',
            meta: {},
            passiveStates: [],
            classId: 1,
            level: 1,
            levelScope: 0,
            levelScopeUp: 0,
            isBoss: false,
            allowBreak: false,
            enableSv: false,
            canReaction: false,
            bounty: 0,
            attackAnimationId: 0,
            reactionSkillId: 0,
            bookChallenge: {
              challengeTroopId: 0,
              stars: [],
            },
            actionOverrides: {},
            ownerParams: createDefaultOwnerParams(),
          }];
        }
        if (filePath.endsWith('States.json')) {
          return [null, {
            id: 1,
            name: '已规范状态',
            chargeConfig: {
              blockActions: false,
              grantAction: false,
              releaseSkillId: 0,
              queueScope: 0,
              queueShift: 0,
            },
            ownerParams: createDefaultOwnerParams(),
          }];
        }
        if (filePath.endsWith('Weapons.json')) {
          return [null];
        }
        if (filePath.endsWith('EquipExtensions.json')) {
          return {
            weaponEquipTypes: [null],
            systemWeaponEquipTypes: [],
            actorEquipSlots: [null, []],
            actorEquips: [null, []],
            actorRefitRules: [null, { slots: [] }],
          };
        }
        if (filePath.endsWith('Armors.json')) {
          return [null];
        }
        return [null];
      }),
      writeJson,
    });

    expect(summary.repairedFiles).toBe(0);
    expect(summary.repairedEntries).toBe(0);
    expect(writeJson).not.toHaveBeenCalled();
  });

  it('修复 Weapons.json 时不会破坏受控线形范围', async () => {
    const writes: Array<{ filePath: string; data: unknown }> = [];

    await auditAndRepairDataFiles('D:/Project/data', {
      readJson: vi.fn(async (filePath: string) => {
        if (filePath.endsWith('System.json')) {
          return {
            elements: ['', '通常'],
            weaponTypes: ['', '主炮', '副炮', 'SE'],
          };
        }
        if (filePath.endsWith('Weapons.json')) {
          return [null, {
            id: 12,
            name: '远程T型炮',
            areaOverride: 1,
            areaMode: 2,
            shapeType: 3,
            areaTargetCount: 3,
            shapeParams: {
              1: { radius: 360 },
              2: { radius: 520, angleDeg: 42 },
              3: { length: 820, width: 104 },
            },
            repeatTime: 1,
          }];
        }
        return [null];
      }),
      writeJson: vi.fn(async (filePath: string, data: unknown) => {
        writes.push({ filePath, data: JSON.parse(JSON.stringify(data)) });
        return null;
      }),
    });

    const weaponPayload = writes.find((item) => item.filePath.endsWith('Weapons.json'))?.data as unknown[];
    expect(weaponPayload[1]).toMatchObject({
      areaOverride: 1,
      areaMode: 2,
      shapeType: 3,
      areaTargetCount: 3,
      shapeParams: {
        3: { length: 820, width: 104 },
      },
    });
  });

  it('修复 Weapons.json 时会保留贯穿和全体范围模式', async () => {
    const writes: Array<{ filePath: string; data: unknown }> = [];

    await auditAndRepairDataFiles('D:/Project/data', {
      readJson: vi.fn(async (filePath: string) => {
        if (filePath.endsWith('System.json')) {
          return {
            elements: ['', '通常'],
            weaponTypes: ['', '主炮', '副炮', 'SE'],
          };
        }
        if (filePath.endsWith('Weapons.json')) {
          return [null, {
            id: 28,
            name: '重型火箭炮',
            areaOverride: 1,
            areaMode: 3,
            shapeType: 3,
            areaTargetCount: 0,
            repeatTime: 3,
          }, {
            id: 113,
            name: '乌尔巴纳',
            areaOverride: 1,
            areaMode: 4,
            shapeType: 0,
            areaTargetCount: 0,
            repeatTime: 1,
          }];
        }
        return [null];
      }),
      writeJson: vi.fn(async (filePath: string, data: unknown) => {
        writes.push({ filePath, data: JSON.parse(JSON.stringify(data)) });
        return null;
      }),
    });

    const weaponPayload = writes.find((item) => item.filePath.endsWith('Weapons.json'))?.data as unknown[];
    expect(weaponPayload[1]).toMatchObject({
      areaMode: 3,
      shapeType: 3,
      areaTargetCount: 0,
      repeatTime: 3,
    });
    expect(weaponPayload[2]).toMatchObject({
      areaMode: 4,
      shapeType: 0,
      areaTargetCount: 0,
      repeatTime: 1,
    });
  });

  it('会把 ownerParams 概率字段修复到 0-100 区间，同时保留 0-1 兼容值', async () => {
    const writes: Array<{ filePath: string; data: unknown }> = [];
    const summary = await auditAndRepairDataFiles('D:/Project/data', {
      readJson: vi.fn(async (filePath: string) => {
        if (filePath.endsWith('System.json')) {
          return {
            elements: ['', '通常', '火炎'],
            weaponTypes: ['', '主炮', '副炮', 'SE', '人类通用武器', '猎人武器', '机械师武器', '战士武器', '摔跤手武器', '护士武器', '实验体改造人武器', '艺术家武器', '波奇武器'],
          };
        }
        if (filePath.endsWith('Enemies.json')) {
          return [null, {
            id: 1,
            name: '测试敌人',
            ownerParams: {
              extraParams: [150, -5, 0.9, 0.5, 120, 2],
              specialParams: [0, 0, 0, 0, 0, 0],
              scalar: [0, 0],
              elementRate: [0, 0, 0],
            },
            passiveStates: [],
          }];
        }
        if (filePath.endsWith('Effects.json')) {
          return [null];
        }
        return [null, {
          id: 1,
          name: '已规范',
          ownerParams: createDefaultOwnerParams(3),
          passiveStates: [],
        }];
      }),
      writeJson: vi.fn(async (filePath: string, data: unknown) => {
        writes.push({ filePath, data: JSON.parse(JSON.stringify(data)) });
        return null;
      }),
    });

    const enemyPayload = writes.find((item) => item.filePath.endsWith('Enemies.json'))?.data as unknown[];
    expect(summary.repairedFiles).toBeGreaterThan(0);
    expect(enemyPayload[1]).toMatchObject({
      ownerParams: {
        extraParams: [100, 0, 0.9, 0.5, 100, 2],
      },
    });
  });

  it('会把 ownerParams 元素抗性下限修复到 -0.7', async () => {
    const writes: Array<{ filePath: string; data: unknown }> = [];
    await auditAndRepairDataFiles('D:/Project/data', {
      readJson: vi.fn(async (filePath: string) => {
        if (filePath.endsWith('System.json')) {
          return {
            elements: ['', '通常', '火炎', '冷气'],
            weaponTypes: ['', '主炮', '副炮', 'SE', '人类通用武器', '猎人武器', '机械师武器', '战士武器', '摔跤手武器', '护士武器', '实验体改造人武器', '艺术家武器', '波奇武器'],
          };
        }
        if (filePath.endsWith('Enemies.json')) {
          return [null, {
            id: 1,
            name: '异常抗性敌人',
            ownerParams: {
              ...createDefaultOwnerParams(4),
              elementRate: [0, -1, -5, -0.4],
            },
            effects: [1],
            passiveStates: [],
          }];
        }
        if (filePath.endsWith('Effects.json')) {
          return [null, {
            effectType: 'owner_element_rate_bonus',
            config: {
              args: {
                ops: [{ group: 'elementRate', key: '2', op: 'add', value: -5 }],
              },
            },
          }];
        }
        return [null, {
          id: 1,
          name: '已规范',
          ownerParams: createDefaultOwnerParams(4),
          passiveStates: [],
        }];
      }),
      writeJson: vi.fn(async (filePath: string, data: unknown) => {
        writes.push({ filePath, data: JSON.parse(JSON.stringify(data)) });
        return null;
      }),
    });

    const enemyPayload = writes.find((item) => item.filePath.endsWith('Enemies.json'))?.data as unknown[];
    expect(enemyPayload[1]).toMatchObject({
      ownerParams: {
        elementRate: [0, -0.7, -0.7, -0.4],
      },
      effects: [],
    });
  });
});

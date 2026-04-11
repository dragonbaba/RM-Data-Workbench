import { describe, expect, it, vi } from 'vitest';
import { auditAndRepairDataFiles, toAuditSummaryText } from './DataAuditService';

const createDefaultOwnerParams = (elementCount = 2) => ({
  extraParams: [0, 0, 0, 0, 0, 0],
  specialParams: [0, 0, 0, 0, 0],
  scalar: [0],
  paramRate: [0, 0, 0, 0, 0, 0, 0, 0],
  elementRate: new Array(elementCount).fill(0),
});

const createDefaultThrowProjectileOffset = () => ({
  13: { x: -36, y: -23 },
});

describe('DataAuditService', () => {
  it('会批量修复目标数据并返回摘要', async () => {
    const writes: Array<{ filePath: string; data: unknown }> = [];
    const files = new Map<string, unknown>([
      ['D:/Project/data/System.json', {
        elements: ['', '通常', '火炎'],
        weaponTypes: ['', '主炮', '副炮', 'SE', '人类通用武器', '猎人武器', '机械师武器', '战士武器', '摔跤手武器', '护士武器', '实验体改造人武器', '艺术家武器', '波奇武器'],
      }],
      ['D:/Project/data/Actors.json', [null, { id: 1, name: '主角', effects: [] }]],
      ['D:/Project/data/Classes.json', [null, { id: 1, name: '猎人', effects: [] }]],
      ['D:/Project/data/Skills.json', [
        null,
        {
          id: 1,
          name: '火球',
          projectileId: 7,
          skillProjectileTag: 1,
          skillCosts: [
            { type: 'item', itemId: 2 },
          ],
        },
      ]],
      ['D:/Project/data/States.json', [
        null,
        {
          id: 1,
          name: '蓄力',
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
        { id: 1, name: '炮台', reactionSkillId: 9 },
      ]],
      ['D:/Project/data/Weapons.json', [
        null,
        { id: 1, name: '主炮' },
      ]],
      ['D:/Project/data/Armors.json', [
        null,
        { id: 1, name: '测试C装', etypeId: 8, hiddenAttackSkillId: 17, effects: [1] },
        { id: 2, name: '测试底盘', etypeId: 9, hiddenAttackSkillId: 23 },
      ]],
      ['D:/Project/data/Projectiles.json', [
        null,
        {
          id: 1,
          name: '旧弹道',
          sourceType: '角色',
          targetType: '敌人',
          launchAnimation: {
            animationId: 3,
            segments: [
              { targetX: 12, targetY: -20, duration: 0, easing: 'easeOutQuad' },
            ],
          },
        },
      ]],
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
        writes.push({ filePath, data });
        return null;
      }),
    });

    expect(summary.checkedFiles).toBe(10);
    expect(summary.repairedFiles).toBe(10);
    expect(summary.repairedEntries).toBe(12);
    expect(writes).toHaveLength(10);

    const actorPayload = writes.find((item) => item.filePath.endsWith('Actors.json'))?.data as unknown[];
    expect(actorPayload[1]).toMatchObject({
      id: 1,
      projectileOffset: createDefaultThrowProjectileOffset(),
      ownerParams: createDefaultOwnerParams(3),
    });

    const classPayload = writes.find((item) => item.filePath.endsWith('Classes.json'))?.data as unknown[];
    expect(classPayload[1]).toMatchObject({
      id: 1,
      ownerParams: createDefaultOwnerParams(3),
    });

    const skillPayload = writes.find((item) => item.filePath.endsWith('Skills.json'))?.data as unknown[];
    expect(skillPayload[1]).toMatchObject({
      projectileId: 7,
      skillProjectileTag: 1,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      actionSequenceType: 1,
      actionSequenceScriptKey: '',
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
          mode: 'none',
          value: 0,
        },
        skillDurability: {
          baseLoss: 1,
          halfBrokenRate: 50,
        },
      },
    });
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

    const itemPayload = writes.find((item) => item.filePath.endsWith('Items.json'))?.data as unknown[];
    expect(itemPayload[1]).toMatchObject({
      projectileId: 5,
      skillProjectileTag: 1,
      reactionSuccessRate: 0,
      reactionPriority: 0,
      actionSequenceType: 2,
      actionSequenceScriptKey: '',
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
          baseLoss: 1,
          halfBrokenRate: 50,
        },
      },
    });
    expect(itemPayload[1]).not.toHaveProperty('damage');

    const enemyPayload = writes.find((item) => item.filePath.endsWith('Enemies.json'))?.data as unknown[];
    expect(enemyPayload[1]).toMatchObject({
      classId: 1,
      level: 1,
      canReaction: true,
      reactionSkillId: 9,
      ownerParams: createDefaultOwnerParams(3),
    });

    const weaponPayload = writes.find((item) => item.filePath.endsWith('Weapons.json'))?.data as unknown[];
    expect(weaponPayload[1]).toMatchObject({
      id: 1,
      ownerParams: createDefaultOwnerParams(3),
    });

    const armorPayload = writes.find((item) => item.filePath.endsWith('Armors.json'))?.data as unknown[];
    expect(armorPayload[1]).toMatchObject({
      etypeId: 8,
      hiddenAttackSkillId: 17,
      effects: [],
      ownerParams: {
        scalar: [0.1],
      },
    });
    expect(armorPayload[2]).toMatchObject({
      etypeId: 9,
      hiddenAttackSkillId: 23,
      ownerParams: createDefaultOwnerParams(3),
    });

    const projectilePayload = writes.find((item) => item.filePath.endsWith('Projectiles.json'))?.data as unknown[];
    expect(projectilePayload[1]).toMatchObject({
      sourceType: 'actor',
      targetType: 'enemy',
      launchAnimation: {
        animationId: 3,
      },
    });
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
          }];
        }
        if (filePath.endsWith('Classes.json')) {
          return [null, { id: 1, name: '猎人', effects: [], ownerParams: createDefaultOwnerParams() }];
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
            sourceType: 'actor',
            sourceId: 0,
            targetType: 'enemy',
            targetId: 0,
            weaponId: 0,
            skillId: 0,
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
              selector: {
                slotIndexes: [],
                etypeIds: [],
                wtypeIds: [],
                atypeIds: [],
              },
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
                baseLoss: 1,
                halfBrokenRate: 50,
              },
            },
          }];
        }
        if (filePath.endsWith('Skills.json')) {
          return [null, {
            id: 1,
            name: '已规范',
            meta: {},
            projectileId: 0,
            skillProjectileTag: -1,
            reactionSuccessRate: 0,
            reactionPriority: 0,
            actionSequenceType: 0,
            actionSequenceScriptKey: '',
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
                baseLoss: 1,
                halfBrokenRate: 50,
              },
            },
            targetCamp: 1,
            targetLifeState: 1,
            selectMode: 1,
            classId: 1,
            level: 1,
            levelScope: 0,
            isBoss: false,
            allowBreak: false,
            bounty: 0,
            attackAnimationId: 0,
            canReaction: false,
            reactionSkillId: 0,
            floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
            extraParams: [
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            ],
            vehicleParams: [
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            ],
            upgradeParams: [
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
              { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            ],
            qualityLock: false,
            attackSkillId: 0,
            attackElementId: 0,
            areaOverride: 0,
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
            elementRates: [0, 0],
            elementRateFloats: [0, 0],
            ownerParams: createDefaultOwnerParams(),
          }];
        }
        return [null, {
          id: 1,
          name: '已规范',
          meta: {},
          projectileId: 0,
          skillProjectileTag: -1,
          reactionSuccessRate: 0,
          reactionPriority: 0,
          chargeConfig: {
            blockActions: false,
            grantAction: false,
            releaseSkillId: 0,
            queueScope: 0,
            queueShift: 0,
          },
          skillCosts: [],
          targetCamp: 1,
          targetLifeState: 1,
          selectMode: 1,
          classId: 1,
          level: 1,
          levelScope: 0,
          isBoss: false,
          allowBreak: false,
          bounty: 0,
          attackAnimationId: 0,
          canReaction: false,
          reactionSkillId: 0,
          floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
          extraParams: [
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
          ],
          vehicleParams: [
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
          ],
          upgradeParams: [
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
            { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
          ],
          qualityLock: false,
          attackSkillId: 0,
          attackElementId: 0,
          areaOverride: 0,
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
          elementRates: [0, 0],
          elementRateFloats: [0, 0],
          ownerParams: createDefaultOwnerParams(),
        }];
      }),
      writeJson,
    });

    expect(summary.repairedFiles).toBe(0);
    expect(summary.repairedEntries).toBe(0);
    expect(writeJson).not.toHaveBeenCalled();
  });
});

export type GameEffectType =
  | 'single_engine_bonus'
  | 'single_cunit_bonus'
  | 'nominal_cunit_salvo'
  | 'single_base_bonus'
  | 'equip_count_bonus'
  | 'pair_same_engine_bonus'
  | 'pair_same_cunit_bonus'
  | 'pair_same_cunit_owner_bonus'
  | 'cunit_slot_action_repeat_bonus'
  | 'base_slot_action_repeat_bonus'
  | 'equip_id_set_bonus';

export type GameEffectOpKind = 'add' | 'mul' | 'set';
export type GameEffectOpGroup =
  | 'baseParams'
  | 'extraParams'
  | 'vehicleParams'
  | 'scalar'
  | 'specialParams'
  | 'baseParamRate';

export const BASE_PARAM_KEYS = ['mhp', 'mmp', 'atk', 'def', 'mat', 'mdf', 'agi', 'luk'] as const;
export type OwnerBaseParamKey = typeof BASE_PARAM_KEYS[number];
export const OWNER_PARAM_RATE_KEYS = BASE_PARAM_KEYS;
export type GameEffectBaseParamKey = typeof BASE_PARAM_KEYS[number];

export interface GameEffectSelector {
  slotIndexes?: number[];
  etypeIds?: number[];
  wtypeIds?: number[];
  atypeIds?: number[];
}

export interface GameEffectBaseOp {
  op: GameEffectOpKind;
  value: number;
}

export interface GameEffectBaseParamOp extends GameEffectBaseOp {
  group: 'baseParams';
  key: GameEffectBaseParamKey;
}

export interface GameEffectExtraParamOp extends GameEffectBaseOp {
  group: 'extraParams';
  key: EquipExtraParamKey;
}

export interface GameEffectVehicleParamOp extends GameEffectBaseOp {
  group: 'vehicleParams';
  key: GameEffectVehicleParamKey;
}

export interface GameEffectScalarOp extends GameEffectBaseOp {
  group: 'scalar';
  key: 'expRate' | 'dropRate';
}

export interface GameEffectSpecialParamOp extends GameEffectBaseOp {
  group: 'specialParams';
  key: 'tgr' | 'grd' | 'rec' | 'pha' | 'pdr' | 'hrg';
}

export interface GameEffectBaseParamRateOp extends GameEffectBaseOp {
  group: 'baseParamRate';
  key: GameEffectBaseParamKey;
}

export type GameEffectAttributeOp =
  | GameEffectBaseParamOp
  | GameEffectExtraParamOp
  | GameEffectVehicleParamOp
  | GameEffectScalarOp
  | GameEffectSpecialParamOp
  | GameEffectBaseParamRateOp;

export interface GameEffectArgs {
  ops?: GameEffectAttributeOp[];
  requiredCount?: number;
  weaponIds?: number[];
  armorIds?: number[];
}

export interface GameEffectConfig {
  selector: GameEffectSelector;
  args: GameEffectArgs;
}

export interface GameEffectEntry {
  id?: number;
  name: string;
  description: string[];
  effectType: GameEffectType;
  isStatic: boolean;
  config: GameEffectConfig;
}

export interface ParamTemplate {
  value?: number;
  floatValue?: number;
  upgradeValue?: number;
  upgradeFloatValue?: number;
}

export interface EquipUpgradeCostEntry {
  successRate: number;
  goldCost: number;
  requiredItemId: number;
  requiredItemAmount: number;
  protectItemId: number;
  protectItemAmount: number;
}

export interface BattleOrderEffects {
  userNext?: number;
  targetCurrent?: number;
  targetNext?: number;
  targetFollow?: boolean;
  speedConvert?: number;
}

export type SkillCostType =
  | 'hp'
  | 'hpRate'
  | 'gold'
  | 'goldRate'
  | 'variable'
  | 'variableRate'
  | 'item'
  | 'weapon'
  | 'armor';

export interface SkillCostEntry {
  type: SkillCostType;
  value: number;
  variableId: number;
  itemId: number;
  weaponId: number;
  armorId: number;
  amount: number;
}

export type SkillDamageType = 'none' | 'hp' | 'heal';
export type SkillDamageFormulaMode = 'basic' | 'script';
export type SkillDurabilityChangeMode = 'none' | 'reduce' | 'recover';

export interface SkillDamageFormulaSpec {
  mode: SkillDamageFormulaMode;
  scriptKey: string;
}

export interface SkillDamageSpec {
  damageType: SkillDamageType;
  damageElementIds: number[];
  damageElementId?: number;
  allowCritical: boolean;
  damageScatter: number;
  formula: SkillDamageFormulaSpec;
}

export interface SkillDurabilityChangeSpec {
  mode: SkillDurabilityChangeMode;
  value: number;
}

export interface SkillDurabilitySpec {
  halfBrokenSkipRate: number;
}

export interface SkillEffectSpec {
  damage: SkillDamageSpec;
  durabilityChange: SkillDurabilityChangeSpec;
  skillDurability: SkillDurabilitySpec;
}

export type EquipExtraParamKey =
  | 'interceptRate'
  | 'evadeRate'
  | 'critRate'
  | 'critDamage'
  | 'hitRate'
  | 'finalDamage';
export const EQUIP_EXTRA_PARAM_KEYS = ['interceptRate', 'evadeRate', 'critRate', 'critDamage', 'hitRate', 'finalDamage'] as const;

export const OWNER_EXTRA_PARAM_KEYS = ['hitRate', 'evadeRate', 'critRate', 'critDamage', 'interceptRate', 'finalDamage'] as const;
export type OwnerExtraParamKey = typeof OWNER_EXTRA_PARAM_KEYS[number];

export const OWNER_SPECIAL_PARAM_KEYS = ['tgr', 'grd', 'rec', 'pha', 'pdr', 'hrg'] as const;
export type OwnerSpecialParamKey = typeof OWNER_SPECIAL_PARAM_KEYS[number];

export const OWNER_SCALAR_KEYS = ['expRate', 'dropRate'] as const;
export type OwnerScalarKey = typeof OWNER_SCALAR_KEYS[number];

export type OwnerParamRateKey = typeof OWNER_PARAM_RATE_KEYS[number];

export type EquipVehicleParamKey =
  | 'weight'
  | 'carryValue'
  | 'loadValue'
  | 'durability'
  | 'ammoCapacity'
  | 'shellPrice'
  | 'repeat'
  | 'actionRepeat';
export const EQUIP_VEHICLE_PARAM_KEYS = ['weight', 'carryValue', 'loadValue', 'durability', 'ammoCapacity', 'shellPrice', 'repeat', 'actionRepeat'] as const;

export type GameEffectVehicleParamKey =
  | 'repeat'
  | 'actionRepeat'
  | 'loadValue'
  | 'carryValue';

export type EquipUpgradeParamKey =
  | 'times'
  | 'atk'
  | 'def';
export const EQUIP_UPGRADE_PARAM_KEYS = ['times', 'atk', 'def'] as const;

export type EquipExtraParamMap = ParamTemplate[];
export type EquipVehicleParamMap = ParamTemplate[];
export type EquipUpgradeParamMap = ParamTemplate[];
export type OwnerBaseParamMap = number[];
export type OwnerParamRateMap = number[];
export type OwnerExtraParamMap = number[];
export type OwnerSpecialParamMap = number[];
export type OwnerScalarMap = number[];

export interface OwnerParams {
  baseParams?: OwnerBaseParamMap;
  paramRate?: OwnerParamRateMap;
  extraParams?: OwnerExtraParamMap;
  specialParams?: OwnerSpecialParamMap;
  scalar?: OwnerScalarMap;
  elementRate?: number[];
}

/** 标准 RPG 效果条目（Items.json 使用对象格式，非 Effects.json ID 引用） */
export interface RPGItemEffect {
  code: number;
  dataId: number;
  value1: number;
  value2: number;
}

export interface RPGItem {
  id: number;
  name: string;
  description?: string[];
  note?: string;
  meta?: Record<string, unknown>;
  price?: number;
  effects?: Array<number | RPGItemEffect>;
  levelLimitBreakAmount?: number;
  ownerParams?: OwnerParams;
  passiveStates?: number[];
  params?: number[];
  floatParams?: number[];
  extraParams?: EquipExtraParamMap;
  vehicleParams?: EquipVehicleParamMap;
  upgradeParams?: EquipUpgradeParamMap;
  upgradeCosts?: EquipUpgradeCostEntry[];
  customParams?: Record<string, { value?: number; floatValue?: number } | number>;
  scripts?: Record<string, string>;
  attackSkillId?: number;
  interceptableMode?: -1 | 0 | 1;
  hiddenAttackSkillId?: number;
  weaponImageId?: number;
  targetCamp?: number;
  targetLifeState?: number;
  targetType?: number;
  selectMode?: number;
  areaMode?: number;
  shapeType?: number;
  areaTargetCount?: number;
  shapeParams?: Record<string, Record<string, number>>;
  repeatTime?: number;
  repeatTimeFloat?: number;
  areaOverride?: number;
  orderEffects?: BattleOrderEffects;
  actionSequenceType?: number;
  actionSequenceScriptKey?: string;
  weaponAction?: {
    mode?: 'none' | 'selected' | 'all';
    countMin?: number;
    countMax?: number;
    maxCount?: number;
    ammoLimited?: boolean;
    requireCanLaunch?: boolean;
    durabilityLossMin?: number;
    durabilityLossMax?: number;
    friendStateId?: number;
  };
  projectileId?: number;
  skillProjectileTag?: number;
  reactionSuccessRate?: number;
  reactionPriority?: number;
  limits?: number;
  needTargetSelect?: boolean;
  needWeaponSelect?: boolean;
  skillCosts?: SkillCostEntry[];
  skillEffectSpec?: SkillEffectSpec;
  weaknessStateEffects?: StateWeaknessEffects;
  chargeConfig?: StateChargeConfig;
  forbidHeal?: boolean;
  elementRates?: number[];
  elementRateFloats?: number[];
  qualityLock?: boolean;
  qualityLevel?: number;
  wtypeId?: number;
  atypeId?: number;
  etypeId?: number;
  equipSlots?: number[];
  equips?: number[];
  isStaticImage?: boolean;
  isTank?: boolean;
}

export interface EnemyDropEntry {
  dropType: 0 | 1 | 2;
  dropId: number;
  dropChance: number;
  isRare?: boolean;
}

export interface EnemyWeaknessSlot {
  elementId: number;
  rate: number;
}

export interface EnemyWeaknessGroup {
  shieldMax: number;
  slots: EnemyWeaknessSlot[];
}

export type EnemyBookChallengeRewardType = 'gold' | 'item' | 'weapon' | 'armor';

export interface EnemyBookChallengeExtraReward {
  rewardType: EnemyBookChallengeRewardType;
  dataId: number;
  amount: number;
}

export interface EnemyBookChallengeStar {
  star: number;
  goldCost: number;
  levelRequirement: number;
  baseParamRate: number;
  passiveStates: number[];
  dropRateBonus: number;
  goldBonus: number;
  expBonus: number;
  extraRewards: EnemyBookChallengeExtraReward[];
}

export interface EnemyBookChallenge {
  challengeTroopId: number;
  stars: EnemyBookChallengeStar[];
}

export interface EnemyAction {
  skillId: number;
  rating: number;
  conditionType: number;
  conditionParam1: number;
  conditionParam2: number;
}

export interface EnemyActionOverride {
  targetCamp: number;
  targetLifeState: number;
  selectMode: number;
  areaMode: number;
  shapeType: number;
  areaTargetCount: number;
  shapeParams: Record<string, Record<string, number>>;
  repeatTime: number;
  repeatTimeFloat: number;
  actionRepeat: number;
  allowSkillBreak: boolean;
  skillUseCount?: number;
  skillDurability?: number;
  forceWhenValid: boolean;
}

export type EnemyActionOverrides = Record<string, EnemyActionOverride>;

export interface StateWeaknessPhaseEffect {
  switchGroupIndex?: number;
  protectElements?: number[];
  unprotectElements?: number[];
}

export interface StateWeaknessEffects {
  onAdd?: StateWeaknessPhaseEffect;
  onRemove?: StateWeaknessPhaseEffect;
}

export interface StateChargeConfig {
  blockActions?: boolean;
  grantAction?: boolean;
  releaseSkillId?: number;
  queueScope?: number;
  queueShift?: number;
}

export interface RPGEnemy extends RPGItem {
  classId?: number;
  level?: number;
  levelScope?: number;
  levelScopeUp?: number;
  isBoss?: boolean;
  enableSv?: boolean;
  allowBreak?: boolean;
  canReaction?: boolean;
  baseWeaknessGroup?: EnemyWeaknessGroup;
  dynamicWeaknessGroups?: EnemyWeaknessGroup[];
  bounty?: number;
  attackAnimationId?: number;
  reactionSkillId?: number;
  actions?: EnemyAction[];
  actionOverrides?: EnemyActionOverrides;
  enemyDrops?: EnemyDropEntry[];
  bookChallenge?: EnemyBookChallenge;
}

export interface QuestRequirement {
  type: number;
  description?: string;
  operator?: string;
  targetValue?: number | boolean;
  questId?: number;
  actorId?: number;
  itemId?: number;
  weaponId?: number;
  armorId?: number;
  switchId?: number;
  variableId?: number;
}

export interface QuestObjective {
  type: number;
  enemyId?: number;
  itemId?: number;
  weaponId?: number;
  armorId?: number;
  switchId?: number;
  variableId?: number;
  targetValue?: number | boolean;
  calculateType?: boolean;
  operator?: string;
  description?: string;
  switches?: Array<{ switchId: number; value: boolean }>;
  variables?: Array<{ variableId: number; value: number; op: string }>;
}

export interface QuestReward {
  type: number;
  itemId?: number;
  weaponId?: number;
  armorId?: number;
  switchId?: number;
  variableId?: number;
  targetValue?: number | boolean;
  op?: string;
  description?: string;
}

export interface SwitchAction {
  switchId: number;
  value: boolean;
}

export interface VariableAction {
  variableId: number;
  value: number;
  op: string;
}

export interface RPGQuest {
  id?: number;
  title: string;
  giver: string;
  category: boolean;
  repeatable: boolean;
  difficulty: number;
  description: string[];
  requirements: QuestRequirement[];
  objectives: QuestObjective[];
  rewards: QuestReward[];
  startSwitches: SwitchAction[];
  switches: SwitchAction[];
  startVariables: VariableAction[];
  variables: VariableAction[];
}

export interface TrajectorySegment {
  targetX: number;
  targetY: number;
  duration: number; // 单位：帧
  easing?: string; // 新版本统一字段（向后兼容）
  easeX?: string; // 旧版本 X 轴缓动
  easeY?: string; // 旧版本 Y 轴缓动
}

export interface LaunchAnimation {
  animationId: number;
  segments: TrajectorySegment[];
}

export interface ProjectileTemplate {
  id?: number;
  name: string;
  startAnimationId?: number;
  launchAnimation: LaunchAnimation;
  endAnimationId?: number;
}

export interface ProjectilePreviewContext {
  sourceType: 'actor' | 'enemy';
  sourceId: number;
  weaponId?: number;
  skillId?: number;
  targetType: 'actor' | 'enemy';
  targetId: number;
}

export type ProjectilePreviewTemplate = ProjectileTemplate & ProjectilePreviewContext;

export interface RPGMapInfo {
  id: number;
  name: string;
  order: number;
  parentId?: number;
  expanded?: boolean;
  scrollX?: number;
  scrollY?: number;
}

export interface RPGMapAudio {
  name?: string;
  pan?: number;
  pitch?: number;
  volume?: number;
}

export interface RPGMapEventPage {
  conditions?: Record<string, unknown>;
  directionFix?: boolean;
  image?: Record<string, unknown>;
  list?: Array<Record<string, unknown>>;
  moveFrequency?: number;
  moveRoute?: Record<string, unknown>;
  moveSpeed?: number;
  moveType?: number;
  priorityType?: number;
  stepAnime?: boolean;
  through?: boolean;
  trigger?: number;
  walkAnime?: boolean;
}

export interface RPGMapEvent {
  id?: number;
  name?: string;
  note?: string;
  x?: number;
  y?: number;
  pages?: RPGMapEventPage[];
}

export interface RPGMap {
  displayName?: string;
  tilesetId?: number;
  width?: number;
  height?: number;
  scrollType?: number;
  disableDashing?: boolean;
  inRoom?: boolean;
  fixedWeather?: string;
  encounterStep?: number;
  note?: string;
  autoplayBgm?: boolean;
  autoplayBgs?: boolean;
  bgm?: RPGMapAudio;
  bgs?: RPGMapAudio;
  data?: number[];
  events?: Array<RPGMapEvent | null>;
  [key: string]: unknown;
}

export type EditorMode = 'script' | 'property' | 'effect' | 'projectile' | 'quest' | 'map' | 'equip' | 'refit' | 'drop';

export type FileType = 'data' | 'quest' | 'projectile' | 'map';

export interface EditorConfig {
  projectRoot: string;
  dataPath: string;
  scriptSavePath: string;
  scriptPath?: string;
  imagePath?: string;
  workspacePath?: string;
  workspaceRoot: string;
  theme: 'dark' | 'light';
  accentColor: 'cyan' | 'magenta' | 'green' | 'orange';
  animationsEnabled: boolean;
  themePreset: 'cyberpunk' | 'minimal' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  updateCheckFrequency: 'startup' | 'daily' | 'weekly' | 'manual';
}


export interface TroopMeetCondition {
  switchId: number;
  switchValue: boolean;
  variableId: number;
  variableOp: string;
  variableValue: number;
}

export const TROOP_MEET_CONDITION_DEFAULT: Readonly<TroopMeetCondition> = Object.freeze({
  switchId: 0,
  switchValue: true,
  variableId: 0,
  variableOp: '>=',
  variableValue: 0,
});

export interface AppState {
  currentData: (RPGItem | RPGEnemy | RPGQuest | ProjectileTemplate | GameEffectEntry | null)[] | null;
  currentMapData: RPGMap | null;
  currentMapInfos: RPGMapInfo[];
  currentMapId: number | null;
  currentFile: string;
  currentFilePath: string;
  currentFileType: FileType;
  currentItemIndex: number;
  currentItem: RPGItem | RPGEnemy | RPGQuest | ProjectileTemplate | GameEffectEntry | RPGMap | null;
  currentScriptKey: string;
  config: EditorConfig;
  uiMode: EditorMode;
  workspaceRoot: string;
}

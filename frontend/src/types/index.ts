export type GameEffectType =
  | 'equip_stat_bonus'
  | 'owner_stat_bonus'
  | 'runtime_stat_bonus'
  | 'single_engine_bonus'
  | 'single_cunit_bonus'
  | 'equip_count_bonus'
  | 'same_base_id_count_bonus'
  | 'pair_same_engine_bonus'
  | 'pair_same_cunit_bonus'
  | 'pair_same_cunit_owner_bonus'
  | 'cunit_owner_stat_bonus'
  | 'cunit_slot_action_repeat_bonus';

export interface GameEffectEntry {
  name: string;
  description: string;
  effectType: GameEffectType;
  isStatic: boolean;
  config: Record<string, unknown>;
}

export interface RPGItem {
  id: number;
  name: string;
  description?: string[];
  note?: string;
  meta?: Record<string, unknown>;
  price?: number;
  gameEffects?: GameEffectEntry[];
  params?: number[];
  floatParams?: number[];
  customParams?: Record<string, { value?: number; floatValue?: number } | number>;
  scripts?: Record<string, string>;
  attackSkillId?: number;
  attackElementId?: number;
  wtypeId?: number;
  atypeId?: number;
  etypeId?: number;
  equipSlots?: number[];
  equips?: number[];
}

export interface EnemyDropEntry {
  dropType: 0 | 1 | 2;
  dropId: number;
  dropChance: number;
  isRare?: boolean;
}

export interface RPGEnemy extends RPGItem {
  enemyDrops?: EnemyDropEntry[];
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
  // 发射方设置
  sourceType?: 'actor' | 'enemy';
  sourceId?: number;
  weaponId?: number; // 角色使用武器
  skillId?: number; // 敌人使用技能
  // 目标方设置
  targetType?: 'actor' | 'enemy';
  targetId?: number;
}

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

export type EditorMode = 'script' | 'property' | 'note' | 'effect' | 'projectile' | 'quest' | 'map' | 'equip' | 'drop';

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

export interface AppState {
  currentData: (RPGItem | RPGEnemy | RPGQuest | ProjectileTemplate | null)[] | null;
  currentMapData: RPGMap | null;
  currentMapInfos: RPGMapInfo[];
  currentMapId: number | null;
  currentFile: string;
  currentFilePath: string;
  currentFileType: FileType;
  currentItemIndex: number;
  currentItem: RPGItem | RPGEnemy | RPGQuest | ProjectileTemplate | RPGMap | null;
  currentScriptKey: string;
  config: EditorConfig;
  uiMode: EditorMode;
  workspaceRoot: string;
}

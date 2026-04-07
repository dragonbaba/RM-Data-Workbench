import { useEffect, useRef, useCallback, memo } from 'react';
import * as PIXI from 'pixi.js';
import { useEditorStore } from '../../stores/editorStore';
import { DataLoaderService } from '../../services/DataLoaderService';
import { ReadImageFile } from '../../../wailsjs/go/main/App';
import type { ProjectileTemplate } from '../../types';
import {
  buildTrajectoryPoints,
  findDataEntryById,
  normalizeBattlerType,
  resolveActorProjectileOffset,
  resolveEnemyProjectileOffset,
  segmentDurationToMs,
  shouldUseStaticActorPreviewFrame,
} from '../../services/ProjectilePreviewUtils';

interface ProjectileCanvasProps {
  isPlaying?: boolean;
  playbackSpeed?: number;
  offsetRevision?: number;
  referenceRevision?: number;
  emitterSide?: 'left' | 'right';
  onPlaybackComplete?: () => void;
}

const easeOutBounce = (t: number): number => {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t - 1.5 / 2.75) * (t - 1.5 / 2.75) + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t - 2.25 / 2.75) * (t - 2.25 / 2.75) + 0.9375;
  return 7.5625 * (t - 2.625 / 2.75) * (t - 2.625 / 2.75) + 0.984375;
};

const easingFunctions: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInQuart: (t) => Math.pow(t, 4),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * Math.pow(t, 4) : 1 - Math.pow(-2 * t + 2, 4) / 2),
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeInOutCirc: (t) => {
    return t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
  },
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeInOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const c = (2 * Math.PI) / 4.5;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c)) / 2 + 1;
  },
  easeInBack: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  easeOutBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  easeInOutBack: (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (2 * t - 2) + c) + 2) / 2;
  },
  easeInBounce: (t) => 1 - easeOutBounce(1 - t),
  easeOutBounce,
  easeInOutBounce: (t) => (t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2),
  bounce: easeOutBounce,
};

// 预览层的全局站位微调：用于对齐游戏内战斗场景基准点
const PREVIEW_BATTLER_SHIFT_X = 28;
const PREVIEW_BATTLER_SHIFT_Y = 34;
const DEFAULT_BATTLER_METRICS = { width: 96, height: 96 };
const MAX_TEXTURE_CACHE_SIZE = 48;

const clampValue = (value: number, min: number, max: number): number => {
  if (max <= min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const alignSpriteToBattleBase = (sprite: PIXI.Sprite, baseX: number, baseY: number) => {
  // 与游戏内 BattlerContainer + battlerSprite(anchor=0.5,1) 语义一致
  sprite.position.set(baseX, baseY);
};

const getBattlerPreviewImageSpec = (
  type: 'actor' | 'enemy',
  id: number,
  dataPath: string,
): { imagePath: string | null; useStaticFrame: boolean } => {
  if (!id || id <= 0) {
    return { imagePath: null, useStaticFrame: false };
  }
  
  const data = type === 'actor' 
    ? DataLoaderService.getCachedDataByName('Actors.json')
    : DataLoaderService.getCachedDataByName('Enemies.json');
  
  const item = findDataEntryById(data, id) as Record<string, unknown> | null;
  if (!item) {
    return { imagePath: null, useStaticFrame: false };
  }
  
  // 角色与敌人均使用战斗图（sv_actors / sv_enemies）
  const imageName = (item.battlerName as string) || '';
  if (!imageName) {
    return { imagePath: null, useStaticFrame: false };
  }
  
  const basePath = dataPath.replace(/[\\/]+$/, '').replace(/[\\/]data$/, '');
  const imageType = type === 'actor' ? 'sv_actors' : 'sv_enemies';
  return {
    imagePath: `${basePath.replace(/\\/g, '/')}/img/${imageType}/${imageName}.png`,
    useStaticFrame: type === 'actor' && shouldUseStaticActorPreviewFrame(item),
  };
};

// 加载角色战斗图：普通 actor 取 9x6 首帧；静态 actor 直接使用整张图。
const loadActorSpriteFrame = async (imagePath: string, useStaticFrame: boolean): Promise<PIXI.Texture | null> => {
  try {
    const dataURL = await ReadImageFile(imagePath);
    if (!dataURL) return null;
    
    const baseTexture = PIXI.BaseTexture.from(dataURL);
    await new Promise<void>((resolve) => {
      if (baseTexture.valid) resolve();
      else baseTexture.once('loaded', () => resolve());
      baseTexture.once('error', () => resolve());
    });
    
    if (!baseTexture.valid) return null;

    if (useStaticFrame) {
      return new PIXI.Texture(baseTexture);
    }
    
    // 9x6 精灵图，取第一帧
    const frameWidth = baseTexture.width / 9;
    const frameHeight = baseTexture.height / 6;
    const frame = new PIXI.Rectangle(0, 0, frameWidth, frameHeight);
    
    return new PIXI.Texture(baseTexture, frame);
  } catch (error) {
    console.warn('Failed to load actor sprite:', imagePath);
    return null;
  }
};

// 加载敌人图片（整张）
const loadEnemyTexture = async (imagePath: string): Promise<PIXI.Texture | null> => {
  try {
    const dataURL = await ReadImageFile(imagePath);
    if (!dataURL) return null;
    return PIXI.Texture.from(dataURL);
  } catch (error) {
    console.warn('Failed to load enemy texture:', imagePath);
    return null;
  }
};

// 创建占位符纹理（使用 RenderTexture，后续可复用到 Sprite）
const createPlaceholderTexture = (app: PIXI.Application, label: string, color: number): PIXI.Texture => {
  const renderTexture = PIXI.RenderTexture.create({ width: 64, height: 64 });
  const container = new PIXI.Container();

  const graphics = new PIXI.Graphics();
  graphics.beginFill(color);
  graphics.drawCircle(32, 32, 32);
  graphics.endFill();
  container.addChild(graphics);

  const text = new PIXI.Text(label, {
    fontFamily: 'Arial',
    fontSize: 16,
    fill: 0xffffff,
    fontWeight: 'bold',
  });
  text.anchor.set(0.5);
  text.position.set(32, 32);
  container.addChild(text);

  app.renderer.render(container, { renderTexture });
  container.destroy({ children: true });

  return renderTexture;
};

export const ProjectileCanvas = memo(({
  isPlaying = false,
  playbackSpeed = 1,
  offsetRevision = 0,
  referenceRevision = 0,
  emitterSide = 'left',
  onPlaybackComplete,
}: ProjectileCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const sourceSpriteRef = useRef<PIXI.Sprite | null>(null);
  const targetSpriteRef = useRef<PIXI.Sprite | null>(null);
  const projectileRef = useRef<PIXI.Sprite | null>(null);
  const projectileTextureRef = useRef<PIXI.Texture | null>(null);
  const trajectoryRef = useRef<PIXI.Graphics | null>(null);
  const animationRef = useRef<number | null>(null);
  const updateSpritesRef = useRef<() => Promise<void>>(async () => {});
  const drawTrajectoryRef = useRef<() => void>(() => {});
  const textureCacheRef = useRef<Map<string, PIXI.Texture>>(new Map());
  const sourcePlaceholderTextureRef = useRef<PIXI.Texture | null>(null);
  const targetPlaceholderTextureRef = useRef<PIXI.Texture | null>(null);
  const sourceLoadTokenRef = useRef(0);
  const targetLoadTokenRef = useRef(0);
  
  const currentItem = useEditorStore((state) => state.currentItem);
  const config = useEditorStore((state) => state.config);
  const template = currentItem as ProjectileTemplate | null;
  const dataPath = config.dataPath || '';

  // 计算站位：保持基线一致，并根据帧尺寸自动防止出界
  const calculatePositions = useCallback((
    app: PIXI.Application,
    sourceMetrics = DEFAULT_BATTLER_METRICS,
    targetMetrics = DEFAULT_BATTLER_METRICS,
  ) => {
    const width = app.screen.width;
    const height = app.screen.height;

    const sourceWidth = Math.max(sourceMetrics.width, 1);
    const sourceHeight = Math.max(sourceMetrics.height, 1);
    const targetWidth = Math.max(targetMetrics.width, 1);
    const targetHeight = Math.max(targetMetrics.height, 1);

    const desiredBaseY = height / 2 + 20 + PREVIEW_BATTLER_SHIFT_Y;
    const baseYMin = Math.max(sourceHeight, targetHeight) + 24;
    const baseYMax = Math.max(baseYMin, height - 20);
    const baseY = clampValue(desiredBaseY, baseYMin, baseYMax);

    const sourceHalf = sourceWidth / 2;
    const targetHalf = targetWidth / 2;
    const leftHalf = emitterSide === 'left' ? sourceHalf : targetHalf;
    const rightHalf = emitterSide === 'left' ? targetHalf : sourceHalf;

    const leftMin = leftHalf + 16;
    const rightMax = width - rightHalf - 16;
    const available = Math.max(0, rightMax - leftMin);
    const minGap = Math.min(160, available);

    const desiredLeft = width * 0.16 + PREVIEW_BATTLER_SHIFT_X;
    const desiredRight = width * 0.84 + PREVIEW_BATTLER_SHIFT_X;
    let leftX = leftMin;
    let rightX = rightMax;

    if (available > 0) {
      leftX = clampValue(desiredLeft, leftMin, rightMax - minGap);
      rightX = clampValue(desiredRight, leftX + minGap, rightMax);
      if (rightX - leftX < minGap) {
        leftX = clampValue(rightX - minGap, leftMin, rightMax - minGap);
      }
    }

    const sourceX = emitterSide === 'left' ? leftX : rightX;
    const targetX = emitterSide === 'left' ? rightX : leftX;
    const sourceY = baseY;
    const targetY = baseY;

    return { sourceX, sourceY, targetX, targetY };
  }, [emitterSide]);

  const getEmitterOffset = useCallback(() => {
    if (!template) return { x: 0, y: 0 };

    const sourceType = normalizeBattlerType(template.sourceType, 'actor');
    const sourceId = template.sourceId || 0;
    if (sourceId <= 0) return { x: 0, y: 0 };

    if (sourceType === 'actor') {
      const weaponId = template.weaponId || 0;
      if (weaponId <= 0) return { x: 0, y: 0 };
      const actor = findDataEntryById(DataLoaderService.getCachedDataByName('Actors.json'), sourceId);
      const weapon = findDataEntryById(DataLoaderService.getCachedDataByName('Weapons.json'), weaponId);
      return resolveActorProjectileOffset(actor, weapon);
    }

    const skillId = template.skillId || 0;
    if (skillId <= 0) return { x: 0, y: 0 };
    const enemy = findDataEntryById(DataLoaderService.getCachedDataByName('Enemies.json'), sourceId);
    return resolveEnemyProjectileOffset(enemy, skillId);
  }, [template]);

  const resolveAnchorPositions = useCallback(() => {
    if (!appRef.current) {
      return null;
    }

    const targetSprite = targetSpriteRef.current;
    const sourceSprite = sourceSpriteRef.current;
    if (sourceSprite && targetSprite) {
      const targetHeight = targetSprite.texture?.height || 0;
      return {
        sourceX: sourceSprite.x,
        sourceY: sourceSprite.y,
        targetX: targetSprite.x,
        targetY: targetSprite.y - targetHeight / 2,
      };
    }

    const fallback = calculatePositions(appRef.current);

    return {
      sourceX: fallback.sourceX,
      sourceY: fallback.sourceY,
      targetX: fallback.targetX,
      targetY: fallback.targetY,
    };
  }, [calculatePositions]);

  const loadBattlerTexture = useCallback(async (type: 'actor' | 'enemy', id: number) => {
    if (id <= 0) return { key: '', texture: null as PIXI.Texture | null };

    const { imagePath, useStaticFrame } = getBattlerPreviewImageSpec(type, id, dataPath);
    if (!imagePath) return { key: '', texture: null as PIXI.Texture | null };

    const renderMode = type === 'actor'
      ? (useStaticFrame ? 'static' : 'sheet')
      : 'static';
    const cacheKey = `${type}:${renderMode}:${imagePath}`;
    const cached = textureCacheRef.current.get(cacheKey);
    if (cached && !cached.destroyed) {
      textureCacheRef.current.delete(cacheKey);
      textureCacheRef.current.set(cacheKey, cached);
      return { key: cacheKey, texture: cached };
    }

    const loaded = type === 'actor'
      ? await loadActorSpriteFrame(imagePath, useStaticFrame)
      : await loadEnemyTexture(imagePath);
    if (!loaded) {
      return { key: '', texture: null as PIXI.Texture | null };
    }

    if (!textureCacheRef.current.has(cacheKey) && textureCacheRef.current.size >= MAX_TEXTURE_CACHE_SIZE) {
      for (const [oldKey, oldTexture] of textureCacheRef.current) {
        if (!oldTexture || oldTexture.destroyed) {
          textureCacheRef.current.delete(oldKey);
          continue;
        }
        if (oldTexture === sourceSpriteRef.current?.texture || oldTexture === targetSpriteRef.current?.texture) {
          continue;
        }
        try {
          oldTexture.destroy(true);
        } catch {
          // ignore texture destroy error
        }
        textureCacheRef.current.delete(oldKey);
        break;
      }
    }

    textureCacheRef.current.set(cacheKey, loaded);
    return { key: cacheKey, texture: loaded };
  }, [dataPath]);

  const applyBattlerTexture = useCallback((
    sprite: PIXI.Sprite,
    texture: PIXI.Texture,
    type: 'actor' | 'enemy',
    facingRight: boolean,
  ) => {
    sprite.texture = texture;
    sprite.anchor.set(0.5, 1);

    if (type === 'actor') {
      sprite.scale.set(facingRight ? -1 : 1, 1);
      return;
    }

    sprite.scale.set(facingRight ? 1 : -1, 1);
  }, []);

  // 更新精灵
  const updateSprites = useCallback(async () => {
    if (!appRef.current || !template || !sourceSpriteRef.current || !targetSpriteRef.current) return;

    const app = appRef.current;
    const sourceSprite = sourceSpriteRef.current;
    const targetSprite = targetSpriteRef.current;

    const sourceType = normalizeBattlerType(template.sourceType, 'actor');
    const targetType = normalizeBattlerType(template.targetType, 'enemy');
    const sourceId = Number(template.sourceId || 0);
    const targetId = Number(template.targetId || 0);

    const sourceToken = ++sourceLoadTokenRef.current;
    const targetToken = ++targetLoadTokenRef.current;

    const [sourceLoaded, targetLoaded] = await Promise.all([
      loadBattlerTexture(sourceType, sourceId),
      loadBattlerTexture(targetType, targetId),
    ]);

    const sourceTexture = sourceLoaded.texture || sourcePlaceholderTextureRef.current;
    const targetTexture = targetLoaded.texture || targetPlaceholderTextureRef.current;
    if (!sourceTexture || !targetTexture) {
      return;
    }

    const sourceIsLeft = emitterSide === 'left';
    const sourceFacingRight = sourceIsLeft;
    const targetFacingRight = !sourceIsLeft;
    const sourceScaleX = sourceType === 'actor'
      ? (sourceFacingRight ? -1 : 1)
      : (sourceFacingRight ? 1 : -1);
    const targetScaleX = targetType === 'actor'
      ? (targetFacingRight ? -1 : 1)
      : (targetFacingRight ? 1 : -1);

    const { sourceX, sourceY, targetX, targetY } = calculatePositions(
      app,
      {
        width: sourceTexture.width * Math.abs(sourceScaleX),
        height: sourceTexture.height,
      },
      {
        width: targetTexture.width * Math.abs(targetScaleX),
        height: targetTexture.height,
      },
    );

    if (sourceToken === sourceLoadTokenRef.current) {
      if (sourceLoaded.texture) {
        applyBattlerTexture(sourceSprite, sourceLoaded.texture, sourceType, sourceFacingRight);
      } else if (sourcePlaceholderTextureRef.current) {
        sourceSprite.texture = sourcePlaceholderTextureRef.current;
        sourceSprite.anchor.set(0.5, 1);
        sourceSprite.scale.set(1, 1);
      }
      alignSpriteToBattleBase(sourceSprite, sourceX, sourceY);
      sourceSprite.visible = true;
    }

    if (targetToken === targetLoadTokenRef.current) {
      if (targetLoaded.texture) {
        applyBattlerTexture(targetSprite, targetLoaded.texture, targetType, targetFacingRight);
      } else if (targetPlaceholderTextureRef.current) {
        targetSprite.texture = targetPlaceholderTextureRef.current;
        targetSprite.anchor.set(0.5, 1);
        targetSprite.scale.set(1, 1);
      }
      alignSpriteToBattleBase(targetSprite, targetX, targetY);
      targetSprite.visible = true;
    }

    // 贴图切换后重绘轨迹，确保发射点基于最新锚点位置。
    drawTrajectoryRef.current();
  }, [template, emitterSide, calculatePositions, applyBattlerTexture, loadBattlerTexture]);

  // 绘制轨迹
  const drawTrajectory = useCallback(() => {
    if (!trajectoryRef.current || !appRef.current || !template) return;

    const graphics = trajectoryRef.current;
    graphics.clear();
    graphics.removeChildren();
    
    const segments = template.launchAnimation?.segments;
    if (!segments || segments.length === 0) return;

    const anchor = resolveAnchorPositions();
    if (!anchor) return;
    const { sourceX, sourceY, targetX, targetY } = anchor;
    const emitterOffset = getEmitterOffset();

    const points = buildTrajectoryPoints(segments, sourceX + emitterOffset.x, sourceY + emitterOffset.y, targetX, targetY);

    // 绘制轨迹线
    graphics.lineStyle(3, 0x00d4ff, 0.8);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }

    // 绘制节点
    points.forEach((point, index) => {
      graphics.beginFill(0x00d4ff);
      graphics.drawCircle(point.x, point.y, 6);
      graphics.endFill();
      
      const text = new PIXI.Text(String(index + 1), {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: 'bold',
      });
      text.anchor.set(0.5);
      text.position.set(point.x + 12, point.y - 12);
      graphics.addChild(text);
    });
  }, [template, getEmitterOffset, resolveAnchorPositions]);

  useEffect(() => {
    updateSpritesRef.current = updateSprites;
  }, [updateSprites]);

  useEffect(() => {
    drawTrajectoryRef.current = drawTrajectory;
  }, [drawTrajectory]);

  // 初始化
  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight || 400,
      backgroundColor: 0x0a0e17,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    });

    canvasRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;
    app.stage.sortableChildren = true;

    // 网格
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0x1a1f2e);
    for (let x = 0; x <= app.screen.width; x += 40) {
      grid.moveTo(x, 0);
      grid.lineTo(x, app.screen.height);
    }
    for (let y = 0; y <= app.screen.height; y += 40) {
      grid.moveTo(0, y);
      grid.lineTo(app.screen.width, y);
    }
    grid.zIndex = 0;
    app.stage.addChild(grid);

    // 单位精灵（复用，不反复销毁）
    sourcePlaceholderTextureRef.current = createPlaceholderTexture(app, '发', 0x00d4ff);
    targetPlaceholderTextureRef.current = createPlaceholderTexture(app, '目', 0xff4444);

    const sourceSprite = new PIXI.Sprite(sourcePlaceholderTextureRef.current);
    sourceSprite.anchor.set(0.5, 1);
    sourceSprite.visible = true;
    sourceSprite.zIndex = 10;
    sourceSpriteRef.current = sourceSprite;
    app.stage.addChild(sourceSprite);

    const targetSprite = new PIXI.Sprite(targetPlaceholderTextureRef.current);
    targetSprite.anchor.set(0.5, 1);
    targetSprite.visible = true;
    targetSprite.zIndex = 10;
    targetSpriteRef.current = targetSprite;
    app.stage.addChild(targetSprite);

    // 轨迹层
    const trajectoryGraphics = new PIXI.Graphics();
    trajectoryGraphics.zIndex = 20;
    app.stage.addChild(trajectoryGraphics);
    trajectoryRef.current = trajectoryGraphics;

    // 弹道
    const projectileGraphics = new PIXI.Graphics();
    projectileGraphics.beginFill(0xffff00);
    projectileGraphics.drawCircle(0, 0, 8);
    projectileGraphics.endFill();
    projectileGraphics.beginFill(0xffff00, 0.3);
    projectileGraphics.drawCircle(0, 0, 16);
    projectileGraphics.endFill();
    
    const texture = app.renderer.generateTexture(projectileGraphics);
    projectileTextureRef.current = texture;
    const projectile = new PIXI.Sprite(texture);
    projectile.anchor.set(0.5);
    projectile.visible = false;
    projectile.zIndex = 30;
    app.stage.addChild(projectile);
    projectileRef.current = projectile;
    
    projectileGraphics.destroy();

    // 窗口变化
    const handleResize = () => {
      if (canvasRef.current && appRef.current) {
        const height = canvasRef.current.clientHeight || 400;
        appRef.current.renderer.resize(canvasRef.current.clientWidth, height);
        void updateSpritesRef.current();
        drawTrajectoryRef.current();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      // 安全清理所有精灵和图形
      try {
        if (sourceSpriteRef.current && !sourceSpriteRef.current.destroyed) {
          sourceSpriteRef.current.destroy({ texture: false, baseTexture: false });
        }
      } catch (e) {}
      sourceSpriteRef.current = null;
      
      try {
        if (targetSpriteRef.current && !targetSpriteRef.current.destroyed) {
          targetSpriteRef.current.destroy({ texture: false, baseTexture: false });
        }
      } catch (e) {}
      targetSpriteRef.current = null;
      
      try {
        if (projectileRef.current && !projectileRef.current.destroyed) {
          projectileRef.current.destroy({ texture: false, baseTexture: false });
        }
      } catch (e) {}
      projectileRef.current = null;

      try {
        if (projectileTextureRef.current && !projectileTextureRef.current.destroyed) {
          projectileTextureRef.current.destroy(true);
        }
      } catch (e) {}
      projectileTextureRef.current = null;
      
      try {
        if (trajectoryRef.current && !trajectoryRef.current.destroyed) {
          trajectoryRef.current.destroy();
        }
      } catch (e) {}

      for (const texture of textureCacheRef.current.values()) {
        try {
          if (!texture.destroyed) {
            texture.destroy(true);
          }
        } catch (e) {
          // 忽略错误
        }
      }
      textureCacheRef.current.clear();

      try {
        if (sourcePlaceholderTextureRef.current && !sourcePlaceholderTextureRef.current.destroyed) {
          sourcePlaceholderTextureRef.current.destroy(true);
        }
      } catch (e) {}
      sourcePlaceholderTextureRef.current = null;

      try {
        if (targetPlaceholderTextureRef.current && !targetPlaceholderTextureRef.current.destroyed) {
          targetPlaceholderTextureRef.current.destroy(true);
        }
      } catch (e) {}
      targetPlaceholderTextureRef.current = null;
      
      try {
        app.destroy(true, { children: true, texture: false, baseTexture: false });
      } catch (e) {}
    };
  }, []);

  // 模板变化
  useEffect(() => {
    updateSprites();
    drawTrajectory();
  }, [updateSprites, drawTrajectory, offsetRevision, referenceRevision]);

  // 播放动画
  useEffect(() => {
    if (!isPlaying || !projectileRef.current || !template || !appRef.current) return;

    const projectile = projectileRef.current;
    const app = appRef.current;
    const segments = template.launchAnimation?.segments;
    
    if (!segments || segments.length === 0) {
      onPlaybackComplete?.();
      return;
    }

    const anchor = resolveAnchorPositions();
    if (!anchor) {
      onPlaybackComplete?.();
      return;
    }
    const { sourceX, sourceY, targetX, targetY } = anchor;
    const emitterOffset = getEmitterOffset();

    const points = buildTrajectoryPoints(segments, sourceX + emitterOffset.x, sourceY + emitterOffset.y, targetX, targetY);

    projectile.visible = true;
    projectile.position.set(sourceX + emitterOffset.x, sourceY + emitterOffset.y);

    let startTime: number | null = null;
    let pointIndex = 0;
    let segmentStartTime = 0;

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
        segmentStartTime = timestamp;
      }

      if (pointIndex >= points.length - 1) {
        projectile.visible = false;
        onPlaybackComplete?.();
        return;
      }

      const segment = segments[pointIndex];
      const duration = segmentDurationToMs(segment.duration) / Math.max(playbackSpeed, 0.01);
      const elapsed = timestamp - segmentStartTime;
      const progress = Math.min(elapsed / duration, 1);

      const startPoint = points[pointIndex];
      const endPoint = points[pointIndex + 1];

      const easeX = segment.easeX || segment.easing || 'linear';
      const easeY = segment.easeY || segment.easing || 'linear';
      const easingX = easingFunctions[easeX] || easingFunctions.linear;
      const easingY = easingFunctions[easeY] || easingFunctions.linear;
      
      const easedProgressX = easingX(progress);
      const easedProgressY = easingY(progress);

      projectile.x = startPoint.x + (endPoint.x - startPoint.x) * easedProgressX;
      projectile.y = startPoint.y + (endPoint.y - startPoint.y) * easedProgressY;
      
      // 朝向
      projectile.rotation = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

      if (progress >= 1) {
        pointIndex++;
        segmentStartTime = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      projectile.visible = false;
    };
  }, [isPlaying, template, playbackSpeed, onPlaybackComplete, getEmitterOffset, resolveAnchorPositions]);

  return (
    <div ref={canvasRef} className="w-full h-full rounded overflow-hidden bg-[#0a0e17]" />
  );
});

ProjectileCanvas.displayName = 'ProjectileCanvas';

export default ProjectileCanvas;

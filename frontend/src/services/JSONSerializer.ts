/**
 * JSONSerializer - JSON 序列化系统
 * 处理数据的序列化、反序列化、版本兼容性和增量保存
 */

import { EventSystem } from '../core/EventSystem';

interface SerializationOptions {
  pretty?: boolean;
  includeNulls?: boolean;
  version?: string;
  compress?: boolean;
}

interface SerializedData {
  version: string;
  timestamp: number;
  data: any;
  checksum?: string;
}

interface VersionMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
}

class JSONSerializerClass {
  private currentVersion = '1.0.0';
  private migrations: VersionMigration[] = [];

  /**
   * 序列化数据
   */
  serialize(data: any, options: SerializationOptions = {}): string {
    const { pretty = true, includeNulls = false, version = this.currentVersion } = options;

    // 清理数据
    let cleanedData = data;
    if (!includeNulls) {
      cleanedData = this.removeNulls(data);
    }

    const serialized: SerializedData = {
      version,
      timestamp: Date.now(),
      data: cleanedData,
    };

    // 生成校验和
    serialized.checksum = this.generateChecksum(serialized.data);

    return pretty ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized);
  }

  /**
   * 反序列化数据
   */
  deserialize(jsonString: string): any {
    try {
      const parsed: SerializedData = JSON.parse(jsonString);

      // 验证校验和
      if (parsed.checksum) {
        const currentChecksum = this.generateChecksum(parsed.data);
        if (currentChecksum !== parsed.checksum) {
          console.warn('[JSONSerializer] Checksum mismatch, data may be corrupted');
        }
      }

      // 版本迁移
      if (parsed.version && parsed.version !== this.currentVersion) {
        parsed.data = this.migrateData(parsed.data, parsed.version, this.currentVersion);
      }

      EventSystem.emit('data:deserialized', parsed);
      return parsed.data;
    } catch (error) {
      console.error('[JSONSerializer] Deserialization failed:', error);
      throw new Error('Failed to deserialize data');
    }
  }

  /**
   * 序列化为 RPG Maker 格式（兼容格式）
   */
  serializeToRPGMaker(data: any[]): string {
    // RPG Maker 使用特定的数组格式，第一个元素为 null
    const rpgData = [null, ...data.filter(item => item !== null)];
    return JSON.stringify(rpgData, null, 2);
  }

  /**
   * 从 RPG Maker 格式反序列化
   */
  deserializeFromRPGMaker(jsonString: string): any[] {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        // 移除第一个 null 元素
        return parsed.slice(1);
      }
      return parsed;
    } catch (error) {
      console.error('[JSONSerializer] RPG Maker deserialization failed:', error);
      throw new Error('Failed to parse RPG Maker data');
    }
  }

  /**
   * 增量序列化（只序列化变更的部分）
   */
  serializeIncremental(
    currentData: any,
    previousData: any,
    options: SerializationOptions = {}
  ): string | null {
    const diff = this.calculateDiff(previousData, currentData);
    
    if (Object.keys(diff).length === 0) {
      return null; // 没有变更
    }

    const serialized: SerializedData = {
      version: this.currentVersion,
      timestamp: Date.now(),
      data: diff,
    };

    return JSON.stringify(serialized, options.pretty ? null : undefined, options.pretty ? 2 : undefined);
  }

  /**
   * 应用增量更新
   */
  applyIncremental(baseData: any, incrementalData: string): any {
    const diff = JSON.parse(incrementalData);
    return this.mergeDiff(baseData, diff.data);
  }

  /**
   * 计算差异
   */
  private calculateDiff(oldData: any, newData: any, path = ''): any {
    if (oldData === newData) return {};

    if (typeof oldData !== typeof newData) {
      return { [path]: newData };
    }

    if (Array.isArray(newData)) {
      const diff: any = {};
      const maxLength = Math.max(oldData?.length || 0, newData.length);
      
      for (let i = 0; i < maxLength; i++) {
        const itemDiff = this.calculateDiff(oldData?.[i], newData[i], `${path}[${i}]`);
        Object.assign(diff, itemDiff);
      }
      
      return diff;
    }

    if (typeof newData === 'object' && newData !== null) {
      const diff: any = {};
      const allKeys = new Set([
        ...Object.keys(oldData || {}),
        ...Object.keys(newData),
      ]);

      allKeys.forEach(key => {
        const keyPath = path ? `${path}.${key}` : key;
        const keyDiff = this.calculateDiff(oldData?.[key], newData[key], keyPath);
        Object.assign(diff, keyDiff);
      });

      return diff;
    }

    return { [path]: newData };
  }

  /**
   * 合并差异
   */
  private mergeDiff(baseData: any, diff: any): any {
    const result = JSON.parse(JSON.stringify(baseData)); // 深拷贝

    Object.entries(diff).forEach(([path, value]) => {
      this.setValueAtPath(result, path, value);
    });

    return result;
  }

  /**
   * 在指定路径设置值
   */
  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split(/\.|\[(\d+)\]/).filter(Boolean);
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      
      if (!(key in current)) {
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 移除 null 值
   */
  private removeNulls(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeNulls(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};
      Object.entries(obj).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          cleaned[key] = this.removeNulls(value);
        }
      });
      return cleaned;
    }

    return obj;
  }

  /**
   * 生成校验和
   */
  private generateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(16);
  }

  /**
   * 注册版本迁移
   */
  registerMigration(migration: VersionMigration): void {
    this.migrations.push(migration);
  }

  /**
   * 迁移数据
   */
  private migrateData(data: any, fromVersion: string, toVersion: string): any {
    let migratedData = data;

    // 按顺序应用迁移
    const applicableMigrations = this.migrations
      .filter(m => this.compareVersions(fromVersion, m.fromVersion) >= 0 &&
                   this.compareVersions(m.toVersion, toVersion) <= 0)
      .sort((a, b) => this.compareVersions(a.fromVersion, b.fromVersion));

    for (const migration of applicableMigrations) {
      try {
        migratedData = migration.migrate(migratedData);
        console.log(`[JSONSerializer] Migrated from ${migration.fromVersion} to ${migration.toVersion}`);
      } catch (error) {
        console.error(`[JSONSerializer] Migration failed:`, error);
      }
    }

    return migratedData;
  }

  /**
   * 比较版本号
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * 验证数据格式
   */
  validate(data: any, schema?: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return { valid: false, errors };
    }

    // 基础类型检查
    if (typeof data !== 'object') {
      errors.push('Data must be an object or array');
      return { valid: false, errors };
    }

    // 如果有 schema，进行 schema 验证
    if (schema) {
      this.validateAgainstSchema(data, schema, '', errors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 根据 schema 验证
   */
  private validateAgainstSchema(data: any, schema: any, path: string, errors: string[]): void {
    if (schema.type && typeof data !== schema.type) {
      errors.push(`${path}: Expected type ${schema.type}, got ${typeof data}`);
      return;
    }

    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((field: string) => {
        if (!(field in data)) {
          errors.push(`${path}: Missing required field "${field}"`);
        }
      });
    }

    if (schema.properties && typeof data === 'object') {
      Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
        if (key in data) {
          this.validateAgainstSchema(data[key], propSchema, `${path}.${key}`, errors);
        }
      });
    }
  }

  /**
   * 克隆数据
   */
  clone<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * 深度合并
   */
  deepMerge(target: any, source: any): any {
    if (typeof source !== 'object' || source === null) {
      return source;
    }

    if (Array.isArray(source)) {
      return source.map((item, index) => 
        this.deepMerge(target?.[index], item)
      );
    }

    const result = { ...target };
    Object.keys(source).forEach(key => {
      result[key] = this.deepMerge(result[key], source[key]);
    });

    return result;
  }
}

export const JSONSerializer = new JSONSerializerClass();
export default JSONSerializer;

/**
 * ScriptPathManager - 脚本路径管理器
 * 处理脚本路径的规范化、解析和转换
 */

import { EventSystem } from '../core/EventSystem';
import {
  BACKSLASH_REGEXP,
  FILE_EXTENSION_REGEXP,
  REMOVE_EXTENSION_REGEXP,
  TRAILING_FORWARD_SLASH_REGEXP,
  WINDOWS_DRIVE_ANY_SLASH_REGEXP,
} from '../constants/regexp';

class ScriptPathManagerClass {
  private workspaceRoot: string = '';
  private scriptExtension: string = '.js';

  /**
   * 设置工作区根目录
   */
  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = this.normalizePath(root);
    EventSystem.emit('workspace:root-changed', this.workspaceRoot);
  }

  /**
   * 获取工作区根目录
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * 规范化路径（统一使用正斜杠）
   */
  normalizePath(path: string): string {
    if (!path) return '';
    return path.replace(BACKSLASH_REGEXP, '/').replace(TRAILING_FORWARD_SLASH_REGEXP, '');
  }

  /**
   * 连接路径
   */
  joinPath(...parts: string[]): string {
    return parts
      .map(part => this.normalizePath(part))
      .filter(part => part)
      .join('/');
  }

  /**
   * 获取文件名（不含扩展名）
   */
  getFileName(filePath: string): string {
    const normalized = this.normalizePath(filePath);
    const parts = normalized.split('/');
    const fileName = parts[parts.length - 1] || '';
    return fileName.replace(REMOVE_EXTENSION_REGEXP, '');
  }

  /**
   * 获取文件扩展名
   */
  getExtension(filePath: string): string {
    const match = filePath.match(FILE_EXTENSION_REGEXP);
    return match ? match[1] : '';
  }

  /**
   * 获取目录路径
   */
  getDirectory(filePath: string): string {
    const normalized = this.normalizePath(filePath);
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash > 0 ? normalized.substring(0, lastSlash) : '';
  }

  /**
   * 转换为绝对路径
   */
  toAbsolutePath(relativePath: string): string {
    if (!this.workspaceRoot) return relativePath;
    if (this.isAbsolutePath(relativePath)) return relativePath;
    return this.joinPath(this.workspaceRoot, relativePath);
  }

  /**
   * 转换为相对路径
   */
  toRelativePath(absolutePath: string): string {
    if (!this.workspaceRoot) return absolutePath;
    const normalized = this.normalizePath(absolutePath);
    if (normalized.startsWith(this.workspaceRoot + '/')) {
      return normalized.substring(this.workspaceRoot.length + 1);
    }
    return absolutePath;
  }

  /**
   * 检查是否为绝对路径
   */
  isAbsolutePath(path: string): boolean {
    const normalized = this.normalizePath(path);
    return normalized.startsWith('/') || WINDOWS_DRIVE_ANY_SLASH_REGEXP.test(normalized);
  }

  /**
   * 解析脚本路径（支持多种格式）
   */
  resolveScriptPath(scriptPath: string, basePath?: string): string {
    let resolved = this.normalizePath(scriptPath);

    // 添加扩展名
    if (!this.getExtension(resolved)) {
      resolved += this.scriptExtension;
    }

    // 如果是相对路径，基于 basePath 或 workspaceRoot 解析
    if (!this.isAbsolutePath(resolved)) {
      const base = basePath || this.workspaceRoot;
      if (base) {
        resolved = this.joinPath(base, resolved);
      }
    }

    return resolved;
  }

  /**
   * 格式化存储路径（用于保存到配置文件）
   */
  formatStoredPath(filePath: string): string {
    // 转换为相对路径存储，便于跨平台
    return this.toRelativePath(filePath);
  }

  /**
   * 解析存储的路径
   */
  parseStoredPath(storedPath: string): string {
    // 转换回绝对路径
    return this.toAbsolutePath(storedPath);
  }

  /**
   * 获取脚本目录下的所有脚本文件
   */
  getScriptFilesInDirectory(dirPath: string): string[] {
    // 这里应该调用后端 API 获取文件列表
    // 暂时返回空数组，后续实现
    return [];
  }

  /**
   * 检查路径是否在脚本目录下
   */
  isInScriptDirectory(filePath: string): boolean {
    const scriptsDir = this.joinPath(this.workspaceRoot, 'scripts');
    const normalized = this.normalizePath(filePath);
    return normalized.startsWith(scriptsDir + '/') || normalized === scriptsDir;
  }

  /**
   * 生成唯一的脚本文件名
   */
  generateUniqueFileName(baseName: string, existingFiles: string[]): string {
    let counter = 1;
    let fileName = baseName;

    while (existingFiles.includes(fileName + this.scriptExtension)) {
      fileName = `${baseName}_${counter}`;
      counter++;
    }

    return fileName + this.scriptExtension;
  }

  /**
   * 比较两个路径是否相同
   */
  isSamePath(path1: string, path2: string): boolean {
    return this.normalizePath(path1) === this.normalizePath(path2);
  }
}

export const ScriptPathManager = new ScriptPathManagerClass();
export default ScriptPathManager;

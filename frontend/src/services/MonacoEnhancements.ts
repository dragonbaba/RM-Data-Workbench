/**
 * MonacoEnhancements - Monaco 编辑器增强功能
 * 提供代码补全、代码片段、悬停提示等功能
 */

import type * as monaco from 'monaco-editor';
import { getMonaco } from './MonacoLoader';

type CompletionKind = keyof typeof import('monaco-editor').languages.CompletionItemKind;

type CompletionEntry = {
  label: string;
  kind: CompletionKind;
  detail: string;
  documentation: string;
  insertText: string;
};

// RPG Maker API 补全项
const RPG_COMPLETIONS: CompletionEntry[] = [
  { label: 'player', kind: 'Variable', detail: 'Player instance', documentation: 'The current player character', insertText: 'player' },
  { label: 'target', kind: 'Variable', detail: 'Target entity', documentation: 'The current target entity', insertText: 'target' },
  { label: 'this.sprite', kind: 'Property', detail: 'Sprite component', documentation: 'Access sprite component for visual manipulation', insertText: 'this.sprite' },
  { label: 'this.body', kind: 'Property', detail: 'Body component', documentation: 'Access physics body component', insertText: 'this.body' },
  { label: 'this.stats', kind: 'Property', detail: 'Stats component', documentation: 'Access character stats', insertText: 'this.stats' },
  { label: 'getPosition', kind: 'Method', detail: 'Get entity position', documentation: 'Returns the current position {x, y}', insertText: 'getPosition()' },
  { label: 'setPosition', kind: 'Method', detail: 'Set entity position', documentation: 'Sets the entity position', insertText: 'setPosition(${1:x}, ${2:y})' },
  { label: 'moveTo', kind: 'Method', detail: 'Move to position', documentation: 'Moves entity towards target', insertText: 'moveTo(${1:x}, ${2:y}, ${3:speed})' },
  { label: 'attack', kind: 'Method', detail: 'Perform attack', documentation: 'Executes an attack on the target', insertText: 'attack(${1:target}, ${2:damage})' },
  { label: 'useSkill', kind: 'Method', detail: 'Use skill', documentation: 'Uses a skill by ID', insertText: 'useSkill(${1:skillId})' },
  { label: 'playAnimation', kind: 'Method', detail: 'Play animation', documentation: 'Plays an animation by name', insertText: 'playAnimation(${1:animName})' },
  { label: 'showDamage', kind: 'Method', detail: 'Show damage number', documentation: 'Displays floating damage number', insertText: 'showDamage(${1:amount}, ${2:isCrit})' },
  { label: 'fadeIn', kind: 'Method', detail: 'Fade in', documentation: 'Fades in sprite/UI element', insertText: 'fadeIn(${1:duration})' },
  { label: 'fadeOut', kind: 'Method', detail: 'Fade out', documentation: 'Fades out sprite/UI element', insertText: 'fadeOut(${1:duration})' },
  { label: 'EventSystem.on', kind: 'Function', detail: 'Listen event', documentation: 'Adds an event listener', insertText: 'EventSystem.on(\'${1:eventName}\', ${2:callback})' },
  { label: 'EventSystem.emit', kind: 'Function', detail: 'Emit event', documentation: 'Emits a global event', insertText: 'EventSystem.emit(\'${1:eventName}\', ${2:data})' },
  { label: 'logger.info', kind: 'Function', detail: 'Log info', documentation: 'Logs an informational message', insertText: 'logger.info(\'${1:message}\')' },
  { label: 'logger.warn', kind: 'Function', detail: 'Log warning', documentation: 'Logs a warning message', insertText: 'logger.warn(\'${1:message}\')' },
  { label: 'logger.error', kind: 'Function', detail: 'Log error', documentation: 'Logs an error message', insertText: 'logger.error(\'${1:message}\')' },
  { label: 'addItem', kind: 'Function', detail: 'Add item', documentation: 'Adds an item to inventory', insertText: 'addItem(${1:itemId}, ${2:quantity})' },
  { label: 'removeItem', kind: 'Function', detail: 'Remove item', documentation: 'Removes an item from inventory', insertText: 'removeItem(${1:itemId}, ${2:quantity})' },
  { label: 'playSound', kind: 'Function', detail: 'Play sound', documentation: 'Plays a sound effect', insertText: 'playSound(\'${1:soundId}\')' },
  { label: 'playMusic', kind: 'Function', detail: 'Play music', documentation: 'Plays background music', insertText: 'playMusic(\'${1:musicId}\')' },
  { label: 'showDialog', kind: 'Function', detail: 'Show dialog', documentation: 'Shows a dialog message', insertText: 'showDialog(\'${1:text}\')' },
];

// 代码片段
const SNIPPETS: CompletionEntry[] = [
  { label: 'if', kind: 'Snippet', detail: 'if statement', documentation: 'Conditional statement', insertText: 'if (${1:condition}) {\n\t${2:// code}\n}' },
  { label: 'if-else', kind: 'Snippet', detail: 'if-else statement', documentation: 'Conditional with else', insertText: 'if (${1:condition}) {\n\t${2:// code}\n} else {\n\t${3:// code}\n}' },
  { label: 'for', kind: 'Snippet', detail: 'for loop', documentation: 'Iterates over a range', insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// code}\n}' },
  { label: 'forEach', kind: 'Snippet', detail: 'Array forEach', documentation: 'Iterates over array elements', insertText: '${1:array}.forEach((${2:element}, ${3:index}) => {\n\t${4:// code}\n})' },
  { label: 'function', kind: 'Snippet', detail: 'Function declaration', documentation: 'Declares a named function', insertText: 'function ${1:name}(${2:params}) {\n\t${3:// code}\n}' },
  { label: 'arrow', kind: 'Snippet', detail: 'Arrow function', documentation: 'Declares an arrow function', insertText: '(${1:params}) => {\n\t${2:// code}\n}' },
  { label: 'async', kind: 'Snippet', detail: 'Async function', documentation: 'Declares an async function', insertText: 'async function ${1:name}(${2:params}) {\n\t${3:// code}\n}' },
  { label: 'try-catch', kind: 'Snippet', detail: 'Error handling', documentation: 'Catches and handles errors', insertText: 'try {\n\t${1:// code}\n} catch (${2:error}) {\n\t${3:// handle error}\n}' },
  { label: 'switch', kind: 'Snippet', detail: 'Switch statement', documentation: 'Multi-branch conditional', insertText: 'switch (${1:expression}) {\n\tcase ${2:value}:\n\t\t${3:// code}\n\t\tbreak;\n\tdefault:\n\t\t${4:// default}\n}' },
  { label: 'class', kind: 'Snippet', detail: 'Class declaration', documentation: 'Declares a new class', insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3:// init}\n\t}\n\n\t${4:method}(${5:params}) {\n\t\t${6:// code}\n\t}\n}' },
  { label: 'Entity', kind: 'Snippet', detail: 'Game entity class', documentation: 'Base class for game entities', insertText: 'class ${1:EntityName} extends Entity {\n\tconstructor(x, y) {\n\t\tsuper(x, y);\n\t\tthis.setup();\n\t}\n\n\tsetup() {\n\t\tthis.sprite = new Sprite(\'${2:texture}\');\n\t}\n\n\tupdate(deltaTime) {\n\t\tsuper.update(deltaTime);\n\t\t${3:// update}\n\t}\n}' },
  { label: 'Event', kind: 'Snippet', detail: 'Event listener', documentation: 'Template for event listeners', insertText: 'EventSystem.on(\'${1:event}\', (data) => {\n\t${2:// handle}\n})' },
  { label: 'log', kind: 'Snippet', detail: 'Debug logging', documentation: 'Logs debug information', insertText: 'logger.debug(\'${1:message}\', { ${2:data} }, \'${3:source}\')' },
];

// 存储注册的 provider
let completionProvider: import('monaco-editor').IDisposable | null = null;
let hoverProvider: import('monaco-editor').IDisposable | null = null;

/**
 * 注册所有增强功能
 */
export function registerEnhancements(): void {
  const monaco = getMonaco();
  if (!monaco) {
    console.warn('[MonacoEnhancements] Monaco not loaded, skipping enhancements');
    return;
  }

  // 注册代码补全
  registerCompletionProvider(monaco);

  // 注册悬停提示
  registerHoverProvider(monaco);

  console.log('[MonacoEnhancements] All enhancements registered');
}

/**
 * 注册代码补全 provider
 */
function registerCompletionProvider(monaco: typeof import('monaco-editor')): void {
  if (completionProvider) {
    completionProvider.dispose();
  }

  completionProvider = monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', ':', '('],

    provideCompletionItems: (model: import('monaco-editor').editor.ITextModel, position: import('monaco-editor').Position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

  const suggestions: import('monaco-editor').languages.CompletionItem[] = [];

      // 添加 RPG API 补全
      RPG_COMPLETIONS.forEach((item) => {
    const kind = monaco.languages.CompletionItemKind[item.kind as keyof typeof monaco.languages.CompletionItemKind];
    suggestions.push({
      label: item.label,
      kind,
      detail: item.detail,
      documentation: { value: item.documentation },
      insertText: item.insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    });
      });

      // 添加代码片段
      SNIPPETS.forEach((snippet) => {
    const kind = monaco.languages.CompletionItemKind[snippet.kind as keyof typeof monaco.languages.CompletionItemKind];
    suggestions.push({
      label: snippet.label,
      kind,
      detail: snippet.detail,
      documentation: { value: snippet.documentation },
      insertText: snippet.insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    });
      });

      return { suggestions };
    },
  });
}

/**
 * 注册悬停提示 provider
 */
function registerHoverProvider(monaco: typeof import('monaco-editor')): void {
  if (hoverProvider) {
    hoverProvider.dispose();
  }

  hoverProvider = monaco.languages.registerHoverProvider('javascript', {
    provideHover: (model: import('monaco-editor').editor.ITextModel, position: import('monaco-editor').Position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const wordText = word.word;

      // 查找匹配的 RPG API
      const rpgItem = RPG_COMPLETIONS.find(item => item.label === wordText);
      if (rpgItem) {
        return {
          contents: [
            { value: `**${rpgItem.label}** - ${rpgItem.detail}` },
            { value: rpgItem.documentation },
          ],
        };
      }

      return null;
    },
  });
}

/**
 * 清理所有注册的 provider
 */
export function disposeEnhancements(): void {
  if (completionProvider) {
    completionProvider.dispose();
    completionProvider = null;
  }
  if (hoverProvider) {
    hoverProvider.dispose();
    hoverProvider = null;
  }
}

export default {
  registerEnhancements,
  disposeEnhancements,
};

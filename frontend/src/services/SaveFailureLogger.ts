import { AppendEditorLog } from '../../wailsjs/go/main/App';

const formatUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return '未知错误';
  }
};

const ensureTrailingBreak = (content: string): string => {
  const trimmed = content.replace(/\s+$/, '');
  return `${trimmed}\n\n`;
};

export const appendEditorFailureLog = async (content: string): Promise<void> => {
  if (!content.trim()) return;
  await AppendEditorLog(ensureTrailingBreak(content));
};

export const buildSaveFailureLog = (title: string, lines: string[]): string => {
  return [title, ...lines].join('\n');
};

export const formatSaveFailureError = (error: unknown): string => formatUnknownError(error);

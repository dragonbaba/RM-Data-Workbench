import { describe, expect, it } from 'vitest';
import { AppendEditorLog } from '../../wailsjs/go/main/App';
import { appendEditorFailureLog, buildSaveFailureLog, formatSaveFailureError } from './SaveFailureLogger';

describe('SaveFailureLogger', () => {
  it('should append normalized content to editor log', async () => {
    await appendEditorFailureLog('line 1\nline 2');

    expect(AppendEditorLog).toHaveBeenCalledTimes(1);
    expect(AppendEditorLog).toHaveBeenCalledWith('line 1\nline 2\n\n');
  });

  it('should build save failure log text in order', () => {
    const log = buildSaveFailureLog('[Title]', ['a', 'b', 'c']);
    expect(log).toBe('[Title]\na\nb\nc');
  });

  it('should prefer stack text for error formatting', () => {
    const error = new Error('boom');
    error.stack = 'STACK';
    expect(formatSaveFailureError(error)).toBe('STACK');
  });

  it('should stringify plain objects when formatting errors', () => {
    expect(formatSaveFailureError({ reason: 'bad' })).toBe(JSON.stringify({ reason: 'bad' }));
  });
});

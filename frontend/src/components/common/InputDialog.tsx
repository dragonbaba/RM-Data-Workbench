import React from 'react';
import { Modal, Input, Button } from 'antd';
import { ToastManager } from './ToastManager';

interface InputDialogOptions {
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  validate?: (value: string) => string | null;
}

interface LogDialogOptions {
  title?: string;
  summary?: string;
  log: string;
  confirmText?: string;
}

interface ChoiceDialogOption<T extends string> {
  value: T;
  label: string;
  type?: 'primary' | 'default';
  danger?: boolean;
}

const copyTextToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};

/**
 * 输入对话框
 * 基于 Ant Design Modal 的封装
 */
export const InputDialog = {
  /**
   * 显示输入对话框
   * @returns Promise<string | null> 返回输入值，取消返回 null
   */
  show: (options: InputDialogOptions = {}): Promise<string | null> => {
    const {
      title = '请输入',
      placeholder = '',
      defaultValue = '',
      confirmText = '确认',
      cancelText = '取消',
      validate,
    } = options;

    return new Promise((resolve) => {
      let inputValue = defaultValue;
      let errorMessage = '';

      const modal = Modal.confirm({
        title: (
          <span style={{ color: '#00d4ff' }}>{title}</span>
        ),
        content: (
          <div className="mt-4">
            <Input
              defaultValue={defaultValue}
              placeholder={placeholder}
              onChange={(e) => {
                inputValue = e.target.value;
                if (validate) {
                  const error = validate(inputValue);
                  errorMessage = error || '';
                }
              }}
              onPressEnter={() => {
                if (validate) {
                  const error = validate(inputValue);
                  if (error) {
                    return;
                  }
                }
                modal.destroy();
                resolve(inputValue);
              }}
              style={{
                backgroundColor: '#1a1f2e',
                borderColor: '#30384d',
                color: '#f3f4f6',
              }}
            />
            {errorMessage && (
              <div className="mt-2 text-sm text-[#ff4444]">{errorMessage}</div>
            )}
          </div>
        ),
        okText: confirmText,
        cancelText: cancelText,
        onOk: () => {
          if (validate) {
            const error = validate(inputValue);
            if (error) {
              return Promise.reject(error);
            }
          }
          resolve(inputValue);
        },
        onCancel: () => {
          resolve(null);
        },
        styles: {
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
        },
        style: {
          backgroundColor: '#1a1f2e',
        },
      });
    });
  },

  /**
   * 显示确认对话框
   */
  confirm: (options: {
    title?: string;
    content?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  } = {}): Promise<boolean> => {
    const {
      title = '确认',
      content = '',
      confirmText = '确认',
      cancelText = '取消',
      type = 'info',
    } = options;

    const typeColors = {
      info: '#00d4ff',
      success: '#00ff88',
      warning: '#ffaa00',
      error: '#ff4444',
    };

    return new Promise((resolve) => {
      Modal.confirm({
        title: (
          <span style={{ color: typeColors[type] }}>{title}</span>
        ),
        content: (
          <div className="mt-4 text-gray-300 whitespace-pre-wrap">{content}</div>
        ),
        okText: confirmText,
        cancelText: cancelText,
        okButtonProps: {
          style: {
            backgroundColor: typeColors[type],
            borderColor: typeColors[type],
            color: '#0a0e17',
          },
        },
        cancelButtonProps: {
          style: {
            backgroundColor: '#30384d',
            borderColor: '#30384d',
            color: '#f3f4f6',
          },
        },
        styles: {
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
        },
        style: {
          backgroundColor: '#1a1f2e',
        },
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  },

  choose: <T extends string>(options: {
    title?: string;
    content?: string;
    choices: ChoiceDialogOption<T>[];
    type?: 'info' | 'success' | 'warning' | 'error';
  }): Promise<T | null> => {
    const {
      title = '请选择',
      content = '',
      choices,
      type = 'info',
    } = options;

    const typeColors = {
      info: '#00d4ff',
      success: '#00ff88',
      warning: '#ffaa00',
      error: '#ff4444',
    };

    return new Promise((resolve) => {
      let settled = false;

      const finish = (value: T | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const modal = Modal.info({
        title: (
          <span style={{ color: typeColors[type] }}>{title}</span>
        ),
        content: (
          <div className="mt-4 text-gray-300 whitespace-pre-wrap">{content}</div>
        ),
        icon: null,
        closable: true,
        maskClosable: false,
        footer: (
          <div className="flex justify-end gap-2">
            {choices.map((choice) => (
              <Button
                key={choice.value}
                type={choice.type || 'default'}
                danger={choice.danger}
                style={choice.type === 'primary' && !choice.danger
                  ? {
                    backgroundColor: typeColors[type],
                    borderColor: typeColors[type],
                    color: '#0a0e17',
                  }
                  : undefined}
                onClick={() => {
                  modal.destroy();
                  finish(choice.value);
                }}
              >
                {choice.label}
              </Button>
            ))}
          </div>
        ),
        onCancel: () => finish(null),
        afterClose: () => finish(null),
        styles: {
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
        },
        style: {
          backgroundColor: '#1a1f2e',
        },
      });
    });
  },

  showLog: (options: LogDialogOptions): Promise<void> => {
    const {
      title = '错误日志',
      summary = '',
      log,
      confirmText = '关闭',
    } = options;

    return new Promise((resolve) => {
      const handleCopy = async () => {
        try {
          await copyTextToClipboard(log);
          ToastManager.success('错误日志已复制');
        } catch (error) {
          ToastManager.error(`复制日志失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      };

      const modal = Modal.info({
        title: (
          <span style={{ color: '#ff4444' }}>{title}</span>
        ),
        content: (
          <div className="mt-4">
            {summary ? (
              <div className="mb-3 text-sm text-gray-300 whitespace-pre-wrap">{summary}</div>
            ) : null}
            <div className="mb-3 flex justify-end">
              <Button size="small" onClick={() => void handleCopy()}>
                复制日志
              </Button>
            </div>
            <Input.TextArea
              value={log}
              readOnly
              autoSize={{ minRows: 10, maxRows: 18 }}
              style={{
                fontFamily: 'Consolas, JetBrains Mono, monospace',
                backgroundColor: '#0f1420',
                borderColor: '#30384d',
                color: '#f3f4f6',
              }}
            />
          </div>
        ),
        okText: confirmText,
        onOk: () => {
          modal.destroy();
          resolve();
        },
        styles: {
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
        },
        style: {
          backgroundColor: '#1a1f2e',
        },
      });
    });
  },
};

export default InputDialog;

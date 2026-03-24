import React from 'react';
import { message } from 'antd';

/**
 * Toast 通知管理器
 * 基于 Ant Design message 的封装
 */
export const ToastManager = {
  /**
   * 显示成功消息
   */
  success: (content: string, duration: number = 3) => {
    message.success({
      content,
      duration,
      style: {
        backgroundColor: '#1a1f2e',
        border: '1px solid #00ff88',
        color: '#00ff88',
      },
    });
  },

  /**
   * 显示错误消息
   */
  error: (content: string, duration: number = 5) => {
    message.error({
      content,
      duration,
      style: {
        backgroundColor: '#1a1f2e',
        border: '1px solid #ff4444',
        color: '#ff4444',
      },
    });
  },

  /**
   * 显示警告消息
   */
  warning: (content: string, duration: number = 4) => {
    message.warning({
      content,
      duration,
      style: {
        backgroundColor: '#1a1f2e',
        border: '1px solid #ffaa00',
        color: '#ffaa00',
      },
    });
  },

  /**
   * 显示信息消息
   */
  info: (content: string, duration: number = 3) => {
    message.info({
      content,
      duration,
      style: {
        backgroundColor: '#1a1f2e',
        border: '1px solid #00d4ff',
        color: '#00d4ff',
      },
    });
  },

  /**
   * 显示加载中
   */
  loading: (content: string = '加载中...') => {
    return message.loading({
      content,
      duration: 0,
      style: {
        backgroundColor: '#1a1f2e',
        border: '1px solid #00d4ff',
        color: '#00d4ff',
      },
    });
  },

  /**
   * 关闭所有消息
   */
  destroy: () => {
    message.destroy();
  },
};

export default ToastManager;

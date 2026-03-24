import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ToastManager } from './ToastManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件
 * 捕获 React 组件树中的错误
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到错误:', error);
    console.error('[ErrorBoundary] 错误信息:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // 显示错误提示
    ToastManager.error(`应用错误: ${error.message}`);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 自定义错误 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0e17] p-4">
          <div className="max-w-md w-full bg-[#1a1f2e] border border-[#ff4444] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#ff4444]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#ff4444]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#ff4444]">应用出错</h2>
            </div>

            <p className="text-gray-400 mb-4">
              抱歉，应用遇到了一个错误。请尝试刷新页面或重置应用。
            </p>

            {this.state.error && (
              <div className="bg-[#0a0e17] rounded p-3 mb-4 overflow-auto max-h-40">
                <pre className="text-sm text-[#ff4444] whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-[#30384d] text-white rounded hover:bg-[#3d465e] transition-colors"
              >
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-[#00d4ff] text-[#0a0e17] rounded hover:bg-[#00b8db] transition-colors font-medium"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

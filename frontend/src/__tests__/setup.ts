import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const storageState = new Map<string, string>();

const storageMock: Storage = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageState.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageState.delete(key);
  },
  clear: () => {
    storageState.clear();
  },
  key: (index: number) => Array.from(storageState.keys())[index] ?? null,
  get length() {
    return storageState.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// 自动清理 DOM
afterEach(() => {
  cleanup();
  storageMock.clear();
});

// 全局 mock
vi.mock('../../wailsjs/go/main/App', () => ({
  AppendEditorLog: vi.fn(),
  OpenFileDialog: vi.fn(),
  SaveFileDialog: vi.fn(),
  ReadJSON: vi.fn(),
  WriteJSON: vi.fn(),
  FileExists: vi.fn(),
  GetDefaultQuest: vi.fn(),
  ReadFileString: vi.fn(),
  WriteFile: vi.fn(),
  DeleteFile: vi.fn(),
  ListDtsFiles: vi.fn(),
  ReadImageFile: vi.fn(),
}));

vi.mock('../../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn(),
  EventsOff: vi.fn(),
  EventsEmit: vi.fn(),
}));

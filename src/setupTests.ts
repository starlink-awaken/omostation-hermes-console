import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

// Mock global fetch for component tests
global.fetch = vi.fn()

// Mock EventSource for components that use it (e.g., EnginesView)
global.EventSource = class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  readyState = 0;
  url: string;
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onopen: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  constructor(url: string) {
    this.url = url;
  }
} as unknown as typeof EventSource;

// Clean up mocks after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

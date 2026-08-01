import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Polyfill vi.mocked for vitest 4.x compatibility
if (!(vi as any).mocked) {
  ;(vi as any).mocked = <T>(item: T): T => item
}

// Mock global fetch for component tests
global.fetch = vi.fn()

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

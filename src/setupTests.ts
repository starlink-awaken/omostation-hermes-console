import '@testing-library/jest-dom'
import { vi, afterEach, beforeEach } from 'vitest'

// Polyfill vi.mocked for vitest 4.x compatibility
if (!(vi as any).mocked) {
  ;(vi as any).mocked = <T>(item: T): T => item
}

// Ensure globalThis.fetch is always a vi.fn() mock
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

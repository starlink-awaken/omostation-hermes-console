import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

// Mock global fetch for component tests
global.fetch = vi.fn()

// Clean up mocks after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

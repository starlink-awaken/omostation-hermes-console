import '@testing-library/jest-dom'

// Mock global fetch for component tests
global.fetch = vi.fn()

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

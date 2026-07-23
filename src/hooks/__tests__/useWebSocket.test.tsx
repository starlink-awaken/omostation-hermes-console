import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWebSocket } from '../useWebSocket'

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readonly url: string
  readyState = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  static instances: MockWebSocket[] = []

  send = vi.fn()

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }

  open() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  closeUnexpectedly() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }
}

describe('useWebSocket', () => {
  afterEach(() => {
    vi.useRealTimers()
    MockWebSocket.instances = []
    vi.unstubAllGlobals()
  })

  it('does not reconnect after an intentional disconnect', () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', MockWebSocket)
    const { result } = renderHook(() => useWebSocket({ url: 'ws://cockpit.test', reconnectInterval: 10 }))

    expect(MockWebSocket.instances).toHaveLength(1)
    act(() => result.current.disconnect())
    act(() => vi.advanceTimersByTime(50))

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(result.current.isConnected).toBe(false)
  })

  it('reconnects after an unexpected close and reports the connection state', () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', MockWebSocket)
    const { result } = renderHook(() => useWebSocket({ url: 'ws://cockpit.test', reconnectInterval: 10 }))
    const firstSocket = MockWebSocket.instances[0]

    act(() => firstSocket.open())
    expect(result.current.isConnected).toBe(true)
    act(() => firstSocket.closeUnexpectedly())
    expect(result.current.isConnected).toBe(false)
    act(() => vi.advanceTimersByTime(10))

    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('keeps the socket stable when callback props change between renders', () => {
    vi.stubGlobal('WebSocket', MockWebSocket)
    const { rerender } = renderHook(
      ({ onMessage }: { onMessage: (data: unknown) => void }) => useWebSocket({ url: 'ws://cockpit.test', onMessage }),
      { initialProps: { onMessage: vi.fn() } },
    )

    rerender({ onMessage: vi.fn() })

    expect(MockWebSocket.instances).toHaveLength(1)
  })
})

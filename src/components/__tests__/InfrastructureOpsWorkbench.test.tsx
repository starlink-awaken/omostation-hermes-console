import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import InfrastructureOpsWorkbench from '../InfrastructureOpsWorkbench'

const computePayload = {
  summary: {
    recent_calls: 10,
    avg_latency_ms: 1168.513,
  },
  nodes: [
    { id: 'macmini-ollama', name: 'MacMini (Ollama)', status: 'online', type: 'LOCAL', cpu_usage: 88, gpu_usage: 92 },
    { id: 'y7000p-lmstudio', name: 'Y7000P (LMStudio)', status: 'offline', type: 'LOCAL', cpu_usage: 0, gpu_usage: 0 },
  ],
  available_models: [
    { model_name: 'openai/gpt-4o', status: 'unhealthy', provider: 'openai', latency_p50: null, calls_today: 12 },
  ],
}

const bosHealthPayload = {
  status: 'ok',
  total_routes: 117,
  domains: {
    governance: 28,
    capability: 27,
    analysis: 23,
    memory: 14,
  },
  metrics: {
    success_rate: 0.8977,
    services_healthy: 4,
    services_degraded: 6,
  },
}

const bosServicesPayload = {
  services: [
    { uri: 'bos://memory/kos/search', domain: 'memory', action: 'search', transport: 'stdio' },
    { uri: 'bos://governance/metaos/decide', domain: 'governance', action: 'decide', transport: 'stdio' },
  ],
}

const runtimePayload = {
  items: [
    { name: 'LLM Gateway', status: 'degraded', cpu: 19.5, memory: 43.5, uptime: '98.2%' },
    { name: 'SharedBrain Bridge', status: 'offline', cpu: 0, memory: 0, uptime: '0%' },
  ],
}

describe('InfrastructureOpsWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders infrastructure chain and navigates through key actions', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/governance/compute/status') return Promise.resolve({ ok: true, json: async () => computePayload } as Response)
      if (url === '/api/bos/health') return Promise.resolve({ ok: true, json: async () => bosHealthPayload } as Response)
      if (url === '/api/bos/services') return Promise.resolve({ ok: true, json: async () => bosServicesPayload } as Response)
      if (url === '/api/services/status') return Promise.resolve({ ok: true, json: async () => runtimePayload } as Response)
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<InfrastructureOpsWorkbench currentPage="Compute" onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('基础设施工作台')).toBeInTheDocument()
      expect(screen.getByText('网格热点')).toBeInTheDocument()
      expect(screen.getByText('节点与模型')).toBeInTheDocument()
      expect(screen.getByText('链路落点')).toBeInTheDocument()
      expect(screen.getByText('governance')).toBeInTheDocument()
      expect(screen.getByText('MacMini (Ollama)')).toBeInTheDocument()
      expect(screen.getByText('Y7000P (LMStudio)')).toBeInTheDocument()
      expect(screen.getByText('先看全局拓扑')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /进入基础设施步骤 网格与 MCP/ }))
    expect(onNavigate).toHaveBeenCalledWith('McpMesh')

    fireEvent.click(screen.getByRole('button', { name: /查看网格域 governance/ }))
    expect(onNavigate).toHaveBeenCalledWith('McpMesh')

    fireEvent.click(screen.getByRole('button', { name: /查看算力节点 MacMini \(Ollama\)/ }))
    expect(onNavigate).toHaveBeenCalledWith('Compute')

    fireEvent.click(screen.getByRole('button', { name: /进入基础设施落点 先看全局拓扑/ }))
    expect(onNavigate).toHaveBeenCalledWith('Topology')
  })

  it('keeps runtime services visible when compute data fails', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/governance/compute/status') return Promise.reject(new Error('compute source offline'))
      if (url === '/api/bos/health') return Promise.resolve({ ok: true, json: async () => bosHealthPayload } as Response)
      if (url === '/api/bos/services') return Promise.resolve({ ok: true, json: async () => bosServicesPayload } as Response)
      if (url === '/api/services/status') return Promise.resolve({ ok: true, json: async () => runtimePayload } as Response)
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<InfrastructureOpsWorkbench currentPage="Overview" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('计算状态数据：compute source offline')
      expect(screen.getByRole('button', { name: '查看运行服务 LLM Gateway' })).toBeInTheDocument()
    })
  })

  it('does not present an all-source outage as a healthy zero state', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('infrastructure backend offline'))

    render(<InfrastructureOpsWorkbench currentPage="Overview" />)

    await waitFor(() => {
      expect(screen.getByText('数据不可用')).toBeInTheDocument()
      expect(screen.getByText('N/A')).toBeInTheDocument()
      expect(screen.queryByText('基础设施平稳')).not.toBeInTheDocument()
      expect(screen.queryByText('成功率 0%')).not.toBeInTheDocument()
    })
  })
})

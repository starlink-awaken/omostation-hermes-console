import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import HealthSummarySection from '../HealthSummarySection'

describe('HealthSummarySection', () => {
  it('does not render fallback zeros as real health data when the source is unavailable', () => {
    render(
      <HealthSummarySection
        healthScore={0}
        healthScoreChange={0}
        activeServices={0}
        totalServices={0}
        activeTasks={0}
        activeTasksSource="unavailable"
        todayRequests={0}
        todayRequestsChange={0}
        dataQuality="unavailable"
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('健康数据为不可用读数')
    expect(screen.getAllByText('N/A')).toHaveLength(4)
    expect(screen.getByText('服务数据不可用')).toBeInTheDocument()
    expect(screen.getByText('任务队列不可用')).toBeInTheDocument()
    expect(screen.getByText('请求数据不可用')).toBeInTheDocument()
  })
})

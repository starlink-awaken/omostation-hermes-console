import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearRecentNavigation,
  hasNavigationContext,
  navigationHash,
  navigationTargetLabel,
  normalizeNavigationTarget,
  openCockpitNavigationTarget,
  parseNavigationHash,
  readRecentNavigation,
  recordRecentNavigation,
  writeNavigationHash,
} from '../cockpitNavigation'

describe('cockpitNavigation', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    })
  })

  it('persists the latest contextual entries without leaking temporary draft keys', () => {
    clearRecentNavigation()
    recordRecentNavigation({ tab: 'TaskCenter', taskQuery: 'repair', draftKey: 'session-draft' }, '修复任务')
    recordRecentNavigation({ tab: 'SystemMap', projectId: 'mesh-router' }, 'mesh-router')

    expect(readRecentNavigation()).toEqual([
      { target: { tab: 'SystemMap', projectId: 'mesh-router' }, label: 'mesh-router' },
      { target: { tab: 'TaskCenter', taskQuery: 'repair' }, label: '修复任务' },
    ])

    clearRecentNavigation()
    expect(readRecentNavigation()).toEqual([])
  })

  it('deduplicates entries by their full navigation target and keeps five entries', () => {
    clearRecentNavigation()
    for (let index = 0; index < 6; index += 1) {
      recordRecentNavigation({ tab: 'SystemMap', projectId: `project-${index}` }, `项目 ${index}`)
    }
    recordRecentNavigation({ tab: 'SystemMap', projectId: 'project-3' }, '项目 3')

    expect(readRecentNavigation()).toHaveLength(5)
    expect(readRecentNavigation()[0]).toEqual({
      target: { tab: 'SystemMap', projectId: 'project-3' },
      label: '项目 3',
    })
    expect(readRecentNavigation().some((entry) => entry.target.projectId === 'project-0')).toBe(false)
    clearRecentNavigation()
  })

  it('distinguishes plain tab navigation from contextual navigation', () => {
    expect(hasNavigationContext({ tab: 'Home' })).toBe(false)
    expect(hasNavigationContext({ tab: 'SystemMap', pageId: 'Overview' })).toBe(true)
    expect(hasNavigationContext({ tab: 'AlertCenter', alertTab: 'rules' })).toBe(true)
  })

  it('keeps contextual identity in recent navigation labels', () => {
    expect(navigationTargetLabel({ tab: 'SystemMap', projectId: 'mesh-router' }))
      .toBe('系统地图 · 项目 mesh-router')
    expect(navigationTargetLabel({ tab: 'TaskCenter', taskQuery: 'repair production entry' }))
      .toBe('任务中心 · repair production entry')
    expect(navigationTargetLabel({ tab: 'AlertCenter', alertTab: 'rules' }))
      .toBe('告警中心 · 告警规则')
  })

  it('opens plain tabs through onNavigate and contextual targets through onOpenTarget', () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    openCockpitNavigationTarget({ tab: 'Guide' }, onNavigate, onOpenTarget)
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Guide' })
    expect(onNavigate).not.toHaveBeenCalled()

    onNavigate.mockClear()
    onOpenTarget.mockClear()

    openCockpitNavigationTarget({ tab: 'Guide' }, onNavigate)
    expect(onNavigate).toHaveBeenCalledWith('Guide')

    openCockpitNavigationTarget({ tab: 'SystemMap', projectId: 'mesh-router' }, onNavigate, onOpenTarget)
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'mesh-router' })
  })

  it('falls back dynamic page targets to SystemMap without losing page focus', () => {
    const target = normalizeNavigationTarget({ tab: 'PageAddedByBackend', taskQuery: 'repair' })

    expect(target).toEqual({
      tab: 'SystemMap',
      pageId: 'PageAddedByBackend',
      taskQuery: 'repair',
    })
    expect(navigationHash({ tab: 'PageAddedByBackend', taskQuery: 'repair' }))
      .toBe('#system-map?page=PageAddedByBackend&task=repair')
  })

  it('serializes and parses navigation hashes with context', () => {
    const hash = navigationHash({
      tab: 'SystemMap',
      projectId: 'mesh-router',
      coverageDimensionId: 'runtime_probe',
      pageId: 'Performance',
      featureDomainId: 'runtime-ops',
      taskQuery: 'repair',
    })

    expect(hash).toBe('#system-map?project=mesh-router&coverage=runtime_probe&page=Performance&feature=runtime-ops&task=repair')
    expect(parseNavigationHash(hash)).toEqual({
      tab: 'SystemMap',
      projectId: 'mesh-router',
      usagePathId: null,
      gapId: null,
      coverageDimensionId: 'runtime_probe',
      pageId: 'Performance',
      featureDomainId: 'runtime-ops',
      taskQuery: 'repair',
      draftKey: null,
      alertTab: null,
    })
  })

  it('supports alert sub-routes when writing and parsing hashes', () => {
    writeNavigationHash({ tab: 'AlertCenter', alertTab: 'rules' })
    expect(window.location.hash).toBe('#alerts/rules')
    expect(parseNavigationHash(window.location.hash)).toEqual({
      tab: 'AlertCenter',
      projectId: null,
      usagePathId: null,
      gapId: null,
      coverageDimensionId: null,
      pageId: null,
      featureDomainId: null,
      taskQuery: '',
      draftKey: null,
      alertTab: 'rules',
    })
  })

  it('keeps the protected GBrain admin surface reachable by deep link', () => {
    writeNavigationHash({ tab: 'GBrainAdmin' })
    expect(window.location.hash).toBe('#gbrain-admin')
    expect(parseNavigationHash(window.location.hash)?.tab).toBe('GBrainAdmin')
  })
})

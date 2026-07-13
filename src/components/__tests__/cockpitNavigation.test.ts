import { describe, expect, it, vi } from 'vitest'
import {
  hasNavigationContext,
  navigationHash,
  openCockpitNavigationTarget,
  parseNavigationHash,
  writeNavigationHash,
} from '../cockpitNavigation'

describe('cockpitNavigation', () => {
  it('distinguishes plain tab navigation from contextual navigation', () => {
    expect(hasNavigationContext({ tab: 'Home' })).toBe(false)
    expect(hasNavigationContext({ tab: 'SystemMap', pageId: 'Overview' })).toBe(true)
    expect(hasNavigationContext({ tab: 'AlertCenter', alertTab: 'rules' })).toBe(true)
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
})

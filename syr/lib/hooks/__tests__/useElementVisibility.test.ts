import { renderHook, act } from '@testing-library/react'
import { useElementVisibility } from '../useElementVisibility'
import { 
  MockIntersectionObserver, 
  setupIntersectionObserverMock,
  createMockElement,
  waitForUpdates
} from '@/lib/services/__tests__/visibility-test-utils'
import { VISIBILITY_CONFIG } from '@/lib/config'

describe('useElementVisibility', () => {
  let cleanup: () => void

  beforeEach(() => {
    cleanup = setupIntersectionObserverMock()
  })

  afterEach(() => {
    cleanup()
  })

  it('should initialize with empty visibility map', () => {
    const { result } = renderHook(() => useElementVisibility())
    
    expect(result.current.visibleElements.size).toBe(0)
  })

  it('should track element visibility changes', async () => {
    const onVisibilityChange = jest.fn()
    const { result } = renderHook(() => useElementVisibility(onVisibilityChange))
    
    const element = createMockElement('element-1')
    document.body.appendChild(element)

    // Start observing
    act(() => {
      result.current.observeElement(element)
    })

    const observer = MockIntersectionObserver.instances[0]
    expect(observer.isObserving(element)).toBe(true)

    // Trigger visibility
    act(() => {
      observer.triggerVisibility('element-1', true)
    })

    await act(async () => {
      await waitForUpdates(VISIBILITY_CONFIG.DEBOUNCE_DELAY + 10)
    })

    expect(result.current.visibleElements.has('element-1')).toBe(true)
    expect(onVisibilityChange).toHaveBeenCalledWith('element-1', true)

    // Trigger invisibility
    act(() => {
      observer.triggerVisibility('element-1', false)
    })

    await act(async () => {
      await waitForUpdates(VISIBILITY_CONFIG.DEBOUNCE_DELAY + 10)
    })

    expect(result.current.visibleElements.has('element-1')).toBe(false)
    expect(onVisibilityChange).toHaveBeenCalledTimes(2)
    expect(onVisibilityChange).toHaveBeenLastCalledWith('element-1', false)

    document.body.removeChild(element)
  })

  it('should handle multiple elements', async () => {
    const onVisibilityChange = jest.fn()
    const { result } = renderHook(() => useElementVisibility(onVisibilityChange))
    
    const element1 = createMockElement('element-1')
    const element2 = createMockElement('element-2')
    const element3 = createMockElement('element-3')
    
    document.body.appendChild(element1)
    document.body.appendChild(element2)
    document.body.appendChild(element3)

    // Start observing
    act(() => {
      result.current.observeElement(element1)
      result.current.observeElement(element2)
      result.current.observeElement(element3)
    })

    const observer = MockIntersectionObserver.instances[0]

    // Trigger multiple visibility changes
    act(() => {
      observer.triggerMultipleVisibility([
        { elementId: 'element-1', isVisible: true },
        { elementId: 'element-2', isVisible: true },
        { elementId: 'element-3', isVisible: false }
      ])
    })

    await act(async () => {
      await waitForUpdates(VISIBILITY_CONFIG.DEBOUNCE_DELAY + 10)
    })

    expect(result.current.visibleElements.size).toBe(2)
    expect(result.current.visibleElements.has('element-1')).toBe(true)
    expect(result.current.visibleElements.has('element-2')).toBe(true)
    expect(result.current.visibleElements.has('element-3')).toBe(false)

    document.body.removeChild(element1)
    document.body.removeChild(element2)
    document.body.removeChild(element3)
  })

  it('should unobserve elements', () => {
    const { result } = renderHook(() => useElementVisibility())
    
    const element = createMockElement('element-1')
    document.body.appendChild(element)

    // Start observing
    act(() => {
      result.current.observeElement(element)
    })

    const observer = MockIntersectionObserver.instances[0]
    expect(observer.isObserving(element)).toBe(true)

    // Stop observing
    act(() => {
      result.current.unobserveElement(element)
    })

    expect(observer.isObserving(element)).toBe(false)

    document.body.removeChild(element)
  })

  it('should batch updates within debounce delay', async () => {
    const onVisibilityChange = jest.fn()
    const { result } = renderHook(() => useElementVisibility(onVisibilityChange))
    
    const element1 = createMockElement('element-1')
    const element2 = createMockElement('element-2')
    
    document.body.appendChild(element1)
    document.body.appendChild(element2)

    act(() => {
      result.current.observeElement(element1)
      result.current.observeElement(element2)
    })

    const observer = MockIntersectionObserver.instances[0]

    // Trigger rapid visibility changes
    act(() => {
      observer.triggerVisibility('element-1', true)
    })
    
    act(() => {
      observer.triggerVisibility('element-2', true)
    })

    // Should batch the updates
    expect(onVisibilityChange).not.toHaveBeenCalled()

    await act(async () => {
      await waitForUpdates(VISIBILITY_CONFIG.DEBOUNCE_DELAY + 10)
    })

    // Should have been called for both elements after debounce
    expect(onVisibilityChange).toHaveBeenCalledTimes(2)
    expect(onVisibilityChange).toHaveBeenCalledWith('element-1', true)
    expect(onVisibilityChange).toHaveBeenCalledWith('element-2', true)

    document.body.removeChild(element1)
    document.body.removeChild(element2)
  })

  it('should disconnect observer on unmount', () => {
    const { unmount } = renderHook(() => useElementVisibility())
    
    expect(MockIntersectionObserver.instances.length).toBe(1)
    
    unmount()
    
    expect(MockIntersectionObserver.instances.length).toBe(0)
  })

  it('should handle threshold properly', async () => {
    const onVisibilityChange = jest.fn()
    const { result } = renderHook(() => useElementVisibility(onVisibilityChange))
    
    const element = createMockElement('element-1')
    document.body.appendChild(element)

    act(() => {
      result.current.observeElement(element)
    })

    const observer = MockIntersectionObserver.instances[0]

    // Below threshold - should not be visible
    act(() => {
      observer.triggerVisibility('element-1', false, VISIBILITY_CONFIG.THRESHOLD / 2)
    })

    await act(async () => {
      await waitForUpdates(VISIBILITY_CONFIG.DEBOUNCE_DELAY + 10)
    })

    expect(result.current.visibleElements.has('element-1')).toBe(false)

    // Above threshold - should be visible
    act(() => {
      observer.triggerVisibility('element-1', true, VISIBILITY_CONFIG.THRESHOLD * 2)
    })

    await act(async () => {
      await waitForUpdates(VISIBILITY_CONFIG.DEBOUNCE_DELAY + 10)
    })

    expect(result.current.visibleElements.has('element-1')).toBe(true)

    document.body.removeChild(element)
  })
})
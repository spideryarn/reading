import { renderHook, act } from '@testing-library/react'
import { useTocAutoScroll } from '../useTocAutoScroll'

describe('useTocAutoScroll', () => {
  let containerElement: HTMLDivElement
  let containerRef: React.RefObject<HTMLElement>
  let scrollToSpy: jest.SpyInstance
  
  beforeEach(() => {
    // Create mock container element
    containerElement = document.createElement('div')
    Object.defineProperty(containerElement, 'scrollTop', {
      writable: true,
      value: 0
    })
    Object.defineProperty(containerElement, 'clientHeight', {
      writable: true,
      value: 500
    })
    
    // Create ref
    containerRef = { current: containerElement }
    
    // Mock scrollTo method
    containerElement.scrollTo = jest.fn()
    scrollToSpy = containerElement.scrollTo as jest.Mock
    
    // Mock getBoundingClientRect
    containerElement.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      right: 100,
      bottom: 500,
      width: 100,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {}
    }))
    
    document.body.appendChild(containerElement)
  })
  
  afterEach(() => {
    if (document.body.contains(containerElement)) {
      document.body.removeChild(containerElement)
    }
    jest.clearAllMocks()
  })
  
  it('should not scroll when no visible headings', () => {
    const { result } = renderHook(() => 
      useTocAutoScroll(containerRef, {
        visibleHeadings: new Set(),
        enableAutoScroll: true
      })
    )
    
    expect(scrollToSpy).not.toHaveBeenCalled()
    expect(result.current.isInCooldown).toBe(false)
  })
  
  it('should scroll to visible heading element', async () => {
    // Create heading element
    const headingElement = document.createElement('div')
    headingElement.setAttribute('data-heading-id', 'heading-1')
    headingElement.getBoundingClientRect = jest.fn(() => ({
      top: 200,
      left: 0,
      right: 100,
      bottom: 220,
      width: 100,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {}
    }))
    containerElement.appendChild(headingElement)
    
    const { rerender } = renderHook(
      ({ visibleHeadings }) => 
        useTocAutoScroll(containerRef, {
          visibleHeadings,
          enableAutoScroll: true
        }),
      {
        initialProps: { visibleHeadings: new Set<string>() }
      }
    )
    
    // Update with visible heading
    act(() => {
      rerender({ visibleHeadings: new Set(['heading-1']) })
    })
    
    // Wait for debounced scroll
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })
    
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 100, // 200 - 500 * 0.2
      behavior: 'smooth'
    })
  })
  
  it('should not scroll when heading is already in view', async () => {
    // Create heading element in top third of container
    const headingElement = document.createElement('div')
    headingElement.setAttribute('data-heading-id', 'heading-1')
    headingElement.getBoundingClientRect = jest.fn(() => ({
      top: 50, // Already in top third
      left: 0,
      right: 100,
      bottom: 70,
      width: 100,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {}
    }))
    containerElement.appendChild(headingElement)
    
    renderHook(() => 
      useTocAutoScroll(containerRef, {
        visibleHeadings: new Set(['heading-1']),
        enableAutoScroll: true
      })
    )
    
    // Wait for debounced scroll
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })
    
    expect(scrollToSpy).not.toHaveBeenCalled()
  })
  
  it('should respect cooldown after manual scroll', async () => {
    const headingElement = document.createElement('div')
    headingElement.setAttribute('data-heading-id', 'heading-1')
    headingElement.getBoundingClientRect = jest.fn(() => ({
      top: 200,
      left: 0,
      right: 100,
      bottom: 220,
      width: 100,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {}
    }))
    containerElement.appendChild(headingElement)
    
    const { rerender } = renderHook(
      ({ visibleHeadings }) => 
        useTocAutoScroll(containerRef, {
          visibleHeadings,
          enableAutoScroll: true,
          cooldownDuration: 1000
        }),
      {
        initialProps: { visibleHeadings: new Set<string>() }
      }
    )
    
    // Simulate manual scroll
    act(() => {
      containerElement.dispatchEvent(new Event('scroll'))
    })
    
    // Update with visible heading while in cooldown
    act(() => {
      rerender({ visibleHeadings: new Set(['heading-1']) })
    })
    
    // Wait for debounced scroll
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })
    
    // Should not have scrolled due to cooldown
    expect(scrollToSpy).not.toHaveBeenCalled()
  })
  
  it.skip('should handle multiple visible headings', async () => {
    // Create multiple heading elements
    const heading1 = document.createElement('div')
    heading1.setAttribute('data-heading-id', 'heading-1')
    heading1.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      bottom: 120,
      height: 20,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    }))
    
    const heading2 = document.createElement('div')
    heading2.setAttribute('data-heading-id', 'heading-2')
    heading2.getBoundingClientRect = jest.fn(() => ({
      top: 300,
      bottom: 320,
      height: 20,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    }))
    
    containerElement.appendChild(heading1)
    containerElement.appendChild(heading2)
    
    // Mock querySelector to find our elements
    const originalQuerySelector = containerElement.querySelector
    containerElement.querySelector = jest.fn((selector: string) => {
      if (selector === '[data-heading-id="heading-1"]') return heading1
      if (selector === '[data-heading-id="heading-2"]') return heading2
      return originalQuerySelector.call(containerElement, selector)
    })
    
    const { rerender } = renderHook(
      ({ visibleHeadings }) => 
        useTocAutoScroll(containerRef, {
          visibleHeadings,
          enableAutoScroll: true
        }),
      {
        initialProps: { visibleHeadings: new Set<string>() }
      }
    )
    
    // Update with visible headings
    act(() => {
      rerender({ visibleHeadings: new Set(['heading-1', 'heading-2']) })
    })
    
    // Wait for debounced scroll
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })
    
    // Should scroll to first heading
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 0, // 100 - 500 * 0.2
      behavior: 'smooth'
    })
  })
  
  it('should clean up on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(containerElement, 'removeEventListener')
    
    const { unmount } = renderHook(() => 
      useTocAutoScroll(containerRef, {
        visibleHeadings: new Set(),
        enableAutoScroll: true
      })
    )
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
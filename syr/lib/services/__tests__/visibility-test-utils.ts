/**
 * Test utilities for mocking Intersection Observer and testing visibility detection
 */

export interface MockIntersectionObserverEntry {
  target: Element
  isIntersecting: boolean
  intersectionRatio: number
  boundingClientRect: DOMRectReadOnly
  intersectionRect: DOMRectReadOnly
  rootBounds: DOMRectReadOnly | null
  time: number
}

export class MockIntersectionObserver {
  private callback: IntersectionObserverCallback
  private elements: Set<Element> = new Set()
  private entries: Map<Element, MockIntersectionObserverEntry> = new Map()
  
  static instances: MockIntersectionObserver[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe(element: Element) {
    this.elements.add(element)
    // Initialize with not visible
    this.entries.set(element, createMockEntry(element, false))
  }

  unobserve(element: Element) {
    this.elements.delete(element)
    this.entries.delete(element)
  }

  disconnect() {
    this.elements.clear()
    this.entries.clear()
    const index = MockIntersectionObserver.instances.indexOf(this)
    if (index > -1) {
      MockIntersectionObserver.instances.splice(index, 1)
    }
  }

  /**
   * Trigger visibility changes for testing
   */
  triggerVisibility(elementOrId: Element | string, isVisible: boolean, intersectionRatio: number = isVisible ? 1 : 0) {
    const element = typeof elementOrId === 'string' 
      ? Array.from(this.elements).find(el => el.getAttribute('data-element-id') === elementOrId)
      : elementOrId

    if (!element || !this.elements.has(element)) return

    const entry = createMockEntry(element, isVisible, intersectionRatio)
    this.entries.set(element, entry)
    
    // Call the callback with the updated entry
    this.callback([entry], this as any)
  }

  /**
   * Trigger multiple visibility changes at once
   */
  triggerMultipleVisibility(changes: Array<{ elementId: string; isVisible: boolean; ratio?: number }>) {
    const entries: MockIntersectionObserverEntry[] = []
    
    for (const change of changes) {
      const element = Array.from(this.elements).find(
        el => el.getAttribute('data-element-id') === change.elementId
      )
      if (element) {
        const entry = createMockEntry(element, change.isVisible, change.ratio ?? (change.isVisible ? 1 : 0))
        this.entries.set(element, entry)
        entries.push(entry)
      }
    }
    
    if (entries.length > 0) {
      this.callback(entries, this as any)
    }
  }

  /**
   * Get all currently observed elements
   */
  getObservedElements(): Element[] {
    return Array.from(this.elements)
  }

  /**
   * Check if an element is currently being observed
   */
  isObserving(elementOrId: Element | string): boolean {
    if (typeof elementOrId === 'string') {
      return Array.from(this.elements).some(
        el => el.getAttribute('data-element-id') === elementOrId
      )
    }
    return this.elements.has(elementOrId)
  }

  /**
   * Reset all instances (useful for cleanup between tests)
   */
  static resetAll() {
    MockIntersectionObserver.instances = []
  }
}

function createMockEntry(
  element: Element,
  isIntersecting: boolean,
  intersectionRatio: number = isIntersecting ? 1 : 0
): MockIntersectionObserverEntry {
  const rect = {
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    top: 0,
    right: 100,
    bottom: 50,
    left: 0,
    toJSON: () => ({})
  } as DOMRectReadOnly

  return {
    target: element,
    isIntersecting,
    intersectionRatio,
    boundingClientRect: rect,
    intersectionRect: isIntersecting ? rect : { ...rect, width: 0, height: 0 } as DOMRectReadOnly,
    rootBounds: rect,
    time: Date.now()
  }
}

/**
 * Setup mock Intersection Observer for testing
 */
export function setupIntersectionObserverMock() {
  // Store original
  const originalIO = global.IntersectionObserver

  // Replace with mock
  global.IntersectionObserver = MockIntersectionObserver as any

  // Return cleanup function
  return () => {
    global.IntersectionObserver = originalIO
    MockIntersectionObserver.resetAll()
  }
}

/**
 * Create a mock DOM element with data-element-id attribute
 */
export function createMockElement(elementId: string, tagName: string = 'div'): HTMLElement {
  const element = document.createElement(tagName)
  element.setAttribute('data-element-id', elementId)
  return element
}

/**
 * Wait for async updates in tests
 */
export async function waitForUpdates(ms: number = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
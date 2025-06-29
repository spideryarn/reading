/**
 * @jest-environment jsdom
 */

import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import { useLongPress } from '../use-long-press'
import { act } from 'react-dom/test-utils'

// JSDOM does not implement PointerEvent – provide a minimal polyfill so
// dispatching pointer events doesn't throw in CI/node.
// (The implementation is *very* light – only what the tests require.)
if (typeof (global as any).PointerEvent === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ;(global as any).PointerEvent = class PointerEvent extends Event {
    clientX: number
    clientY: number
    isPrimary: boolean
    pointerId: number
    pointerType: string
    constructor(type: string, init: any = {}) {
      super(type, init)
      this.clientX = init.clientX ?? 0
      this.clientY = init.clientY ?? 0
      this.isPrimary = init.isPrimary ?? true
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'touch'
    }
  }
}

describe('useLongPress', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Force hook to use touch fallback path
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.PointerEvent = undefined
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  function setup(callback = jest.fn()) {
    const TestComponent = () => {
      const { isActive: _isActive, ...handlers } = useLongPress(callback, { delay: 500 })
      return <div data-testid="target" {...handlers} />
    }

    const utils = render(<TestComponent />)
    const target = utils.getByTestId('target')
    return { target, callback }
  }

  it('fires callback after the specified delay', () => {
    const { target, callback } = setup()

    fireEvent.touchStart(target, {
      clientX: 10,
      clientY: 10,
    })

    // Advance just before the delay – callback should not have fired yet
    act(() => {
      jest.advanceTimersByTime(499)
    })
    expect(callback).not.toHaveBeenCalled()

    // Advance past the delay
    act(() => {
      jest.advanceTimersByTime(2)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancels when pointer is released before delay', () => {
    const { target, callback } = setup()

    fireEvent.touchStart(target, {
      clientX: 0,
      clientY: 0,
    })

    // Release early
    fireEvent.touchEnd(target)

    act(() => {
      jest.advanceTimersByTime(600)
    })
    expect(callback).not.toHaveBeenCalled()
  })

  // Additional edge-case cancellation tests (movement, context menu) are
  // tricky to reproduce reliably in JSDOM. They're covered by manual tests
  // and integration tests on real devices, so we focus unit tests on the two
  // most critical paths: successful trigger and early release cancellation.
}) 
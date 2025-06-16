import { renderHook, act } from '@testing-library/react'
import { useLongPress } from '../use-long-press'

// Mock timers
jest.useFakeTimers()

describe('useLongPress', () => {
  const mockCallback = jest.fn()

  beforeEach(() => {
    mockCallback.mockClear()
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
  })

  it('calls callback after default delay', () => {
    const { result } = renderHook(() => useLongPress(mockCallback))

    const mockEvent = {
      isPrimary: true,
      clientX: 100,
      clientY: 100
    } as React.PointerEvent

    act(() => {
      result.current.onPointerDown(mockEvent)
    })

    expect(result.current.isActive).toBe(true)
    expect(mockCallback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(result.current.isActive).toBe(false)
  })

  it('calls callback after custom delay', () => {
    const { result } = renderHook(() => useLongPress(mockCallback, { delay: 1000 }))

    const mockEvent = {
      isPrimary: true,
      clientX: 100,
      clientY: 100
    } as React.PointerEvent

    act(() => {
      result.current.onPointerDown(mockEvent)
    })

    act(() => {
      jest.advanceTimersByTime(999)
    })
    expect(mockCallback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(mockCallback).toHaveBeenCalledTimes(1)
  })

  it('cancels on pointer up', () => {
    const { result } = renderHook(() => useLongPress(mockCallback))

    const mockEvent = {
      isPrimary: true,
      clientX: 100,
      clientY: 100
    } as React.PointerEvent

    act(() => {
      result.current.onPointerDown(mockEvent)
    })

    act(() => {
      jest.advanceTimersByTime(250)
    })

    act(() => {
      result.current.onPointerUp()
    })

    expect(result.current.isActive).toBe(false)

    act(() => {
      jest.advanceTimersByTime(250)
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('cancels on movement beyond threshold', () => {
    const { result } = renderHook(() => useLongPress(mockCallback))

    const startEvent = {
      isPrimary: true,
      clientX: 100,
      clientY: 100
    } as React.PointerEvent

    const moveEvent = {
      isPrimary: true,
      clientX: 120, // 20px movement (> 10px threshold)
      clientY: 100
    } as React.PointerEvent

    act(() => {
      result.current.onPointerDown(startEvent)
    })

    act(() => {
      result.current.onPointerMove(moveEvent)
    })

    expect(result.current.isActive).toBe(false)

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('does not cancel on small movement within threshold', () => {
    const { result } = renderHook(() => useLongPress(mockCallback))

    const startEvent = {
      isPrimary: true,
      clientX: 100,
      clientY: 100
    } as React.PointerEvent

    const moveEvent = {
      isPrimary: true,
      clientX: 105, // 5px movement (< 10px threshold)
      clientY: 105
    } as React.PointerEvent

    act(() => {
      result.current.onPointerDown(startEvent)
    })

    act(() => {
      result.current.onPointerMove(moveEvent)
    })

    expect(result.current.isActive).toBe(true)

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(mockCallback).toHaveBeenCalledTimes(1)
  })

  it('ignores non-primary pointer events', () => {
    const { result } = renderHook(() => useLongPress(mockCallback))

    const nonPrimaryEvent = {
      isPrimary: false,
      clientX: 100,
      clientY: 100
    } as React.PointerEvent

    act(() => {
      result.current.onPointerDown(nonPrimaryEvent)
    })

    expect(result.current.isActive).toBe(false)

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('cleans up timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useLongPress(mockCallback))

    const mockEvent = {
      isPrimary: true,
      clientX: 100,
      clientY: 100
    } as React.PointerEvent

    act(() => {
      result.current.onPointerDown(mockEvent)
    })

    expect(result.current.isActive).toBe(true)

    unmount()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })
})
import { renderHook } from '@testing-library/react'
import { useCanHover } from '../use-can-hover'

// Mock react-responsive
jest.mock('react-responsive', () => ({
  useMediaQuery: jest.fn()
}))

// Dynamic import required for Jest mocking
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockUseMediaQuery = require('react-responsive').useMediaQuery

describe('useCanHover', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockClear()
  })

  it('returns true when both hover and fine pointer are available', () => {
    mockUseMediaQuery
      .mockReturnValueOnce(true)  // (hover: hover)
      .mockReturnValueOnce(true)  // (pointer: fine)

    const { result } = renderHook(() => useCanHover())
    expect(result.current).toBe(true)
  })

  it('returns false when hover is not available', () => {
    mockUseMediaQuery
      .mockReturnValueOnce(false) // (hover: hover)
      .mockReturnValueOnce(true)  // (pointer: fine)

    const { result } = renderHook(() => useCanHover())
    expect(result.current).toBe(false)
  })

  it('returns false when fine pointer is not available', () => {
    mockUseMediaQuery
      .mockReturnValueOnce(true)  // (hover: hover)
      .mockReturnValueOnce(false) // (pointer: fine)

    const { result } = renderHook(() => useCanHover())
    expect(result.current).toBe(false)
  })

  it('returns false when neither capability is available', () => {
    mockUseMediaQuery
      .mockReturnValueOnce(false) // (hover: hover)
      .mockReturnValueOnce(false) // (pointer: fine)

    const { result } = renderHook(() => useCanHover())
    expect(result.current).toBe(false)
  })

  it('calls useMediaQuery with correct queries', () => {
    renderHook(() => useCanHover())

    expect(mockUseMediaQuery).toHaveBeenCalledWith({ query: '(hover: hover)' })
    expect(mockUseMediaQuery).toHaveBeenCalledWith({ query: '(pointer: fine)' })
    expect(mockUseMediaQuery).toHaveBeenCalledTimes(2)
  })
})
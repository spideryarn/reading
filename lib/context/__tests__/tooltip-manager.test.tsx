import { renderHook, act } from '@testing-library/react'
import { TooltipManagerProvider, useTooltipManager } from '../tooltip-manager'

function renderWithProvider<T>(callback: () => T) {
  return renderHook(callback, { wrapper: TooltipManagerProvider })
}

describe('TooltipManager context', () => {
  it('defaults to null openId', () => {
    const { result } = renderWithProvider(() => useTooltipManager())
    expect(result.current.openId).toBeNull()
  })

  it('setOpenId updates openId value', () => {
    const { result } = renderWithProvider(() => useTooltipManager())

    act(() => {
      result.current.setOpenId('tooltip-1')
    })

    expect(result.current.openId).toBe('tooltip-1')
  })

  it('setOpenId(null) closes any open tooltip', () => {
    const { result } = renderWithProvider(() => useTooltipManager())

    act(() => {
      result.current.setOpenId('tooltip-2')
    })

    act(() => {
      result.current.setOpenId(null)
    })

    expect(result.current.openId).toBeNull()
  })
}) 
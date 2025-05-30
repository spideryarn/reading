import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeadingTree, buildHeadingTree, type Heading, type HeadingNode } from '../heading-tree'

describe('buildHeadingTree', () => {
  it('should build a hierarchical tree from flat headings', () => {
    const headings: Heading[] = [
      { id: 'h1-a', text: 'a', level: 1, elementId: 'syr-h1-a' },
      { id: 'h2-a_a', text: 'a_a', level: 2, elementId: 'syr-h2-a_a' },
      { id: 'h2-a_b', text: 'a_b', level: 2, elementId: 'syr-h2-a_b' },
      { id: 'h3-a_b_a', text: 'a_b_a', level: 3, elementId: 'syr-h3-a_b_a' },
      { id: 'h4-a_b_a_a', text: 'a_b_a_a', level: 4, elementId: 'syr-h4-a_b_a_a' },
      { id: 'h2-a_c', text: 'a_c', level: 2, elementId: 'syr-h2-a_c' }
    ]
    
    const tree = buildHeadingTree(headings)
    
    // Should have one root node
    expect(tree).toHaveLength(1)
    expect(tree[0].text).toBe('a')
    
    // Root should have 3 children
    expect(tree[0].children).toHaveLength(3)
    expect(tree[0].children[0].text).toBe('a_a')
    expect(tree[0].children[1].text).toBe('a_b')
    expect(tree[0].children[2].text).toBe('a_c')
    
    // a_b should have one child
    expect(tree[0].children[1].children).toHaveLength(1)
    expect(tree[0].children[1].children[0].text).toBe('a_b_a')
    
    // a_b_a should have one child
    expect(tree[0].children[1].children[0].children).toHaveLength(1)
    expect(tree[0].children[1].children[0].children[0].text).toBe('a_b_a_a')
    
    // Leaf nodes should have no children
    expect(tree[0].children[0].children).toHaveLength(0) // a_a
    expect(tree[0].children[2].children).toHaveLength(0) // a_c
    expect(tree[0].children[1].children[0].children[0].children).toHaveLength(0) // a_b_a_a
  })
  
  it('should handle multiple root nodes', () => {
    const headings: Heading[] = [
      { id: 'h1-1', text: 'First Root', level: 1, elementId: 'syr-h1-1' },
      { id: 'h2-1', text: 'Child 1', level: 2, elementId: 'syr-h2-1' },
      { id: 'h1-2', text: 'Second Root', level: 1, elementId: 'syr-h1-2' },
      { id: 'h2-2', text: 'Child 2', level: 2, elementId: 'syr-h2-2' }
    ]
    
    const tree = buildHeadingTree(headings)
    
    expect(tree).toHaveLength(2)
    expect(tree[0].text).toBe('First Root')
    expect(tree[1].text).toBe('Second Root')
    expect(tree[0].children[0].text).toBe('Child 1')
    expect(tree[1].children[0].text).toBe('Child 2')
  })
})

describe('HeadingTree', () => {
  const mockHeadings: Heading[] = [
    { id: 'h1-a', text: 'a', level: 1, elementId: 'syr-h1-a' },
    { id: 'h2-a_a', text: 'a_a', level: 2, elementId: 'syr-h2-a_a' },
    { id: 'h2-a_b', text: 'a_b', level: 2, elementId: 'syr-h2-a_b' },
    { id: 'h3-a_b_a', text: 'a_b_a', level: 3, elementId: 'syr-h3-a_b_a' },
    { id: 'h2-a_c', text: 'a_c', level: 2, elementId: 'syr-h2-a_c' }
  ]
  
  const defaultProps = {
    headings: mockHeadings,
    themeColors: {
      hover: 'hover:bg-blue-50',
      text: 'group-hover:text-blue-900',
      levelText: 'text-gray-400',
      levelTextHover: 'group-hover:text-blue-600'
    },
    onHeadingClick: jest.fn(),
    getTooltipContent: jest.fn(() => <div>Tooltip</div>),
    handleTooltipShow: jest.fn(),
    collapsedIds: new Set<string>(),
    onToggleExpanded: jest.fn()
  }
  
  it('should render all headings when none are collapsed', () => {
    render(<HeadingTree {...defaultProps} />)
    
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('a_a')).toBeInTheDocument()
    expect(screen.getByText('a_b')).toBeInTheDocument()
    expect(screen.getByText('a_b_a')).toBeInTheDocument()
    expect(screen.getByText('a_c')).toBeInTheDocument()
  })
  
  it('should show chevron buttons for non-leaf nodes', () => {
    render(<HeadingTree {...defaultProps} />)
    
    // Should have chevrons for 'a' and 'a_b' (they have children)
    const buttons = screen.getAllByRole('button', { name: /collapse section/i })
    expect(buttons).toHaveLength(2)
  })
  
  it('should toggle expand/collapse when chevron is clicked', () => {
    const onToggleExpanded = jest.fn()
    render(<HeadingTree {...defaultProps} onToggleExpanded={onToggleExpanded} />)
    
    const buttons = screen.getAllByRole('button', { name: /collapse section/i })
    fireEvent.click(buttons[0]) // Click on 'a' chevron
    
    expect(onToggleExpanded).toHaveBeenCalledWith('h1-a')
  })
  
  it('should hide children when node is collapsed', () => {
    const collapsedIds = new Set(['h2-a_b']) // Collapse a_b
    render(<HeadingTree {...defaultProps} collapsedIds={collapsedIds} />)
    
    // Should see all except a_b_a (child of collapsed a_b)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('a_a')).toBeInTheDocument()
    expect(screen.getByText('a_b')).toBeInTheDocument()
    expect(screen.queryByText('a_b_a')).not.toBeInTheDocument()
    expect(screen.getByText('a_c')).toBeInTheDocument()
  })
  
  it('should show expand chevron for collapsed nodes', () => {
    const collapsedIds = new Set(['h2-a_b'])
    render(<HeadingTree {...defaultProps} collapsedIds={collapsedIds} />)
    
    // Should have one expand button and one collapse button
    expect(screen.getByRole('button', { name: /expand section/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /collapse section/i })).toBeInTheDocument()
  })
  
  it('should handle heading click', () => {
    const onHeadingClick = jest.fn()
    render(<HeadingTree {...defaultProps} onHeadingClick={onHeadingClick} />)
    
    fireEvent.click(screen.getByText('a_a'))
    
    expect(onHeadingClick).toHaveBeenCalledWith({
      id: 'h2-a_a',
      text: 'a_a',
      level: 2,
      elementId: 'syr-h2-a_a',
      children: []
    })
  })
})
import { render, screen, fireEvent } from '@testing-library/react'
import { VerticalIconNav } from '../vertical-icon-nav'

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  Article: ({ size, weight, className }: any) => (
    <div data-testid="article-icon" data-size={size} data-weight={weight} className={className}>Article</div>
  ),
  Robot: ({ size, weight, className }: any) => (
    <div data-testid="robot-icon" data-size={size} data-weight={weight} className={className}>Robot</div>
  ),
  ListBullets: ({ size, weight, className }: any) => (
    <div data-testid="list-bullets-icon" data-size={size} data-weight={weight} className={className}>ListBullets</div>
  ),
  ChatCircle: ({ size, weight, className }: any) => (
    <div data-testid="chat-circle-icon" data-size={size} data-weight={weight} className={className}>ChatCircle</div>
  ),
  BookOpen: ({ size, weight, className }: any) => (
    <div data-testid="book-open-icon" data-size={size} data-weight={weight} className={className}>BookOpen</div>
  ),
  MagnifyingGlass: ({ size, weight, className }: any) => (
    <div data-testid="magnifying-glass-icon" data-size={size} data-weight={weight} className={className}>MagnifyingGlass</div>
  ),
}))

describe('VerticalIconNav', () => {
  const mockOnTabClick = jest.fn()

  beforeEach(() => {
    mockOnTabClick.mockClear()
  })

  it('renders all navigation icons', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    // Check that all expected icons are rendered
    expect(screen.getByTestId('article-icon')).toBeInTheDocument()
    expect(screen.getByTestId('robot-icon')).toBeInTheDocument()
    expect(screen.getByTestId('list-bullets-icon')).toBeInTheDocument()
    expect(screen.getByTestId('chat-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('book-open-icon')).toBeInTheDocument()
    expect(screen.getByTestId('magnifying-glass-icon')).toBeInTheDocument()
  })

  it('renders icons with correct properties', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    // Check icon properties (size=20, weight=duotone)
    const articleIcon = screen.getByTestId('article-icon')
    expect(articleIcon).toHaveAttribute('data-size', '20')
    expect(articleIcon).toHaveAttribute('data-weight', 'duotone')
  })

  it('applies active state styling to the active tab', () => {
    render(<VerticalIconNav activeTab="original" onTabClick={mockOnTabClick} />)
    
    const originalButton = screen.getByRole('button', { name: /original document/i })
    
    // Should have active state classes
    expect(originalButton).toHaveClass('bg-orange-50', 'text-orange-700', 'border-r-2', 'border-orange-500')
  })

  it('does not apply active state to inactive tabs', () => {
    render(<VerticalIconNav activeTab="original" onTabClick={mockOnTabClick} />)
    
    const chatButton = screen.getByRole('button', { name: /chat:/i })
    
    // Should not have active state classes
    expect(chatButton).not.toHaveClass('bg-orange-50', 'text-orange-700')
  })

  it('calls onTabClick when a button is clicked', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    const chatButton = screen.getByRole('button', { name: /chat:/i })
    fireEvent.click(chatButton)
    
    expect(mockOnTabClick).toHaveBeenCalledWith('chat')
    expect(mockOnTabClick).toHaveBeenCalledTimes(1)
  })

  it('calls onTabClick with correct tab IDs for all buttons', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    const expectedCalls = [
      ['original', /original document/i],
      ['ai-generated', /ai-generated/i],
      ['summary', /summary/i],
      ['chat', /chat:/i],
      ['glossary', /glossary/i],
      ['search', /search/i]
    ]
    
    expectedCalls.forEach(([expectedId, namePattern], index) => {
      const button = screen.getByRole('button', { name: namePattern })
      fireEvent.click(button)
      
      expect(mockOnTabClick).toHaveBeenNthCalledWith(index + 1, expectedId)
    })
    
    expect(mockOnTabClick).toHaveBeenCalledTimes(6)
  })

  it('has proper accessibility attributes', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Document navigation')
    
    // Check that buttons have proper aria-labels
    const originalButton = screen.getByRole('button', { name: /original document: view the unmodified source document/i })
    expect(originalButton).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} className="custom-class" />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('custom-class')
  })

  it('maintains consistent 48px width styling', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('w-12', 'min-w-12', 'max-w-12')
  })

  it('renders buttons with proper sizes and hover states', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    const buttons = screen.getAllByRole('button')
    
    buttons.forEach(button => {
      expect(button).toHaveClass('h-12', 'w-12')
      expect(button).toHaveClass('hover:bg-gray-50', 'hover:text-gray-900')
    })
  })

  it('has tooltip triggers with proper data attributes', () => {
    render(<VerticalIconNav onTabClick={mockOnTabClick} />)
    
    // Check that buttons have data-state attribute from Radix tooltip trigger
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAttribute('data-state', 'closed')
    })
  })
})
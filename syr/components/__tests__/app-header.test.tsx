import { render, screen } from '@testing-library/react'
import { AppHeader } from '../app-header'

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>
  }
})

jest.mock('next/image', () => {
  return function MockImage({ alt, ...props }: any) {
    return <img alt={alt} {...props} />
  }
})

describe('AppHeader', () => {
  it('renders the Spideryarn logo and brand name', () => {
    render(<AppHeader />)
    
    expect(screen.getByAltText('Spideryarn logo')).toBeInTheDocument()
    expect(screen.getByText('Spideryarn')).toBeInTheDocument()
    expect(screen.getByLabelText('Return to homepage')).toHaveAttribute('href', '/')
  })

  it('renders title when provided', () => {
    render(<AppHeader title="Test Page" />)
    
    expect(screen.getByRole('heading', { name: 'Test Page' })).toBeInTheDocument()
  })

  it('renders back link when provided', () => {
    render(<AppHeader backLink="/documents" backText="Back to Documents" />)
    
    const backLink = screen.getByRole('link', { name: /back to documents/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/documents')
  })

  it('uses default back text when not provided', () => {
    render(<AppHeader backLink="/documents" />)
    
    expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    const actions = <button>Test Action</button>
    render(<AppHeader actions={actions} />)
    
    expect(screen.getByRole('button', { name: 'Test Action' })).toBeInTheDocument()
  })

  it('renders both title and back link together', () => {
    render(
      <AppHeader 
        title="Tweet Thread" 
        backLink="/documents/test" 
        backText="Back to document"
      />
    )
    
    expect(screen.getByRole('heading', { name: 'Tweet Thread' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to document/i })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<AppHeader className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has proper header structure and accessibility', () => {
    render(<AppHeader title="Test Page" />)
    
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('sticky', 'top-0', 'z-50')
  })
})
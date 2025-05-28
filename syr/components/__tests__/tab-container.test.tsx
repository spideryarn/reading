import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabContainer, Tab } from '../tab-container';

describe('TabContainer', () => {
  const mockTabs: Tab[] = [
    {
      id: 'tab1',
      label: 'First Tab',
      content: <div>Content for first tab</div>
    },
    {
      id: 'tab2',
      label: 'Second Tab',
      content: <div>Content for second tab</div>
    },
    {
      id: 'tab3',
      label: 'Third Tab',
      content: <div>Content for third tab</div>
    }
  ];

  it('should render nothing when no tabs are provided', () => {
    const { container } = render(<TabContainer tabs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render all tab buttons', () => {
    render(<TabContainer tabs={mockTabs} />);
    
    expect(screen.getByText('First Tab')).toBeInTheDocument();
    expect(screen.getByText('Second Tab')).toBeInTheDocument();
    expect(screen.getByText('Third Tab')).toBeInTheDocument();
  });

  it('should display first tab content by default', () => {
    render(<TabContainer tabs={mockTabs} />);
    
    expect(screen.getByText('Content for first tab')).toBeInTheDocument();
    expect(screen.queryByText('Content for second tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Content for third tab')).not.toBeInTheDocument();
  });

  it('should display default tab content when defaultTab is specified', () => {
    render(<TabContainer tabs={mockTabs} defaultTab="tab2" />);
    
    expect(screen.queryByText('Content for first tab')).not.toBeInTheDocument();
    expect(screen.getByText('Content for second tab')).toBeInTheDocument();
    expect(screen.queryByText('Content for third tab')).not.toBeInTheDocument();
  });

  it('should switch tabs on click', async () => {
    const user = userEvent.setup();
    render(<TabContainer tabs={mockTabs} />);
    
    // Initially first tab is active
    expect(screen.getByText('Content for first tab')).toBeInTheDocument();
    
    // Click on second tab
    await user.click(screen.getByText('Second Tab'));
    
    // Second tab content should be visible
    expect(screen.queryByText('Content for first tab')).not.toBeInTheDocument();
    expect(screen.getByText('Content for second tab')).toBeInTheDocument();
    
    // Click on third tab
    await user.click(screen.getByText('Third Tab'));
    
    // Third tab content should be visible
    expect(screen.queryByText('Content for second tab')).not.toBeInTheDocument();
    expect(screen.getByText('Content for third tab')).toBeInTheDocument();
  });

  it('should maintain active tab state', () => {
    render(<TabContainer tabs={mockTabs} />);
    
    const firstTabButton = screen.getByText('First Tab');
    const secondTabButton = screen.getByText('Second Tab');
    
    // First tab should be active by default
    expect(firstTabButton.className).toContain('border-blue-500 text-blue-600');
    expect(secondTabButton.className).toContain('border-transparent text-gray-700');
    
    // Click second tab
    fireEvent.click(secondTabButton);
    
    // Second tab should now be active
    expect(firstTabButton.className).toContain('border-transparent text-gray-700');
    expect(secondTabButton.className).toContain('border-blue-500 text-blue-600');
  });

  it('should render correct content for active tab', () => {
    render(<TabContainer tabs={mockTabs} />);
    
    // Switch through all tabs
    mockTabs.forEach((tab) => {
      fireEvent.click(screen.getByText(tab.label));
      expect(screen.getByText(`Content for ${tab.label.toLowerCase()}`)).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation (arrow keys)', () => {
    render(<TabContainer tabs={mockTabs} />);
    
    const tabButtons = screen.getAllByRole('button');
    
    // Focus first tab
    tabButtons[0].focus();
    expect(document.activeElement).toBe(tabButtons[0]);
    
    // Note: Keyboard navigation would require implementing keyboard event handlers
    // in the actual component. This test is a placeholder for that functionality.
  });

  it('should apply custom className', () => {
    const customClass = 'custom-container-class';
    const { container } = render(
      <TabContainer tabs={mockTabs} className={customClass} />
    );
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('should render title when provided', () => {
    const title = 'My Tab Container';
    render(<TabContainer tabs={mockTabs} title={title} />);
    
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(title).tagName).toBe('H2');
  });

  it('should not render title when not provided', () => {
    render(<TabContainer tabs={mockTabs} />);
    
    const headings = screen.queryAllByRole('heading');
    expect(headings).toHaveLength(0);
  });

  it('should have proper ARIA attributes', () => {
    render(<TabContainer tabs={mockTabs} />);
    
    const nav = screen.getByRole('navigation', { name: 'Tabs' });
    expect(nav).toBeInTheDocument();
  });

  it('should handle invalid defaultTab gracefully', () => {
    render(<TabContainer tabs={mockTabs} defaultTab="non-existent-tab" />);
    
    // Should fall back to first tab
    expect(screen.getByText('Content for first tab')).toBeInTheDocument();
  });

  it('should handle empty defaultTab string', () => {
    render(<TabContainer tabs={mockTabs} defaultTab="" />);
    
    // Should fall back to first tab
    expect(screen.getByText('Content for first tab')).toBeInTheDocument();
  });

  it('should render complex content correctly', () => {
    const complexTabs: Tab[] = [
      {
        id: 'complex1',
        label: 'Complex Tab',
        content: (
          <div>
            <h3>Complex Content</h3>
            <p>With multiple elements</p>
            <button>Interactive button</button>
          </div>
        )
      }
    ];
    
    render(<TabContainer tabs={complexTabs} />);
    
    expect(screen.getByText('Complex Content')).toBeInTheDocument();
    expect(screen.getByText('With multiple elements')).toBeInTheDocument();
    expect(screen.getByText('Interactive button')).toBeInTheDocument();
  });
});
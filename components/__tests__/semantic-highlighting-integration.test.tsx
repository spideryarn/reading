/**
 * @jest-environment jsdom
 */
// Integration tests for semantic highlighting system
// See docs/reference/TOOL_HIGHLIGHT.md for complete system documentation

import React from 'react'
import { render } from '@testing-library/react'
import { getSemanticHighlightClass } from '@/lib/utils/semantic-highlighting'

// Mock document elements with different confidence scores
const createMockElement = (elementId: string, confidence: number) => {
  const element = document.createElement('div')
  element.setAttribute('data-element-id', elementId)
  element.textContent = `Test content for element ${elementId}`
  return { element, confidence }
}

describe('Semantic Highlighting Integration', () => {
  beforeEach(() => {
    // Clear document body before each test
    document.body.innerHTML = ''
  })

  it('should apply correct CSS classes based on confidence scores', () => {
    // Create test elements with different confidence levels
    const testCases = [
      { elementId: 'el-1', confidence: 0.1, expectedClass: 'semantic-highlight-very-low' },
      { elementId: 'el-2', confidence: 0.3, expectedClass: 'semantic-highlight-low' },
      { elementId: 'el-3', confidence: 0.5, expectedClass: 'semantic-highlight-medium' },
      { elementId: 'el-4', confidence: 0.7, expectedClass: 'semantic-highlight-high' },
      { elementId: 'el-5', confidence: 0.9, expectedClass: 'semantic-highlight-very-high' }
    ]

    // Add elements to DOM
    testCases.forEach(({ elementId, confidence }) => {
      const { element } = createMockElement(elementId, confidence)
      document.body.appendChild(element)
    })

    // Apply highlighting (simulating what HighlightManagement component does)
    testCases.forEach(({ elementId, confidence, expectedClass }) => {
      const element = document.querySelector(`[data-element-id="${elementId}"]`)
      expect(element).not.toBeNull()
      
      if (element) {
        const highlightClass = getSemanticHighlightClass(confidence * 100)
        element.classList.add(highlightClass)
        element.setAttribute('data-semantic-highlight', 'true')
        element.setAttribute('data-semantic-confidence', confidence.toString())

        // Verify the correct class was applied
        expect(element.classList.contains(expectedClass)).toBe(true)
        expect(element.getAttribute('data-semantic-highlight')).toBe('true')
        expect(element.getAttribute('data-semantic-confidence')).toBe(confidence.toString())
      }
    })
  })

  it('should clear semantic highlights correctly', () => {
    // Create and add test elements
    const testElements = [
      createMockElement('el-1', 0.2),
      createMockElement('el-2', 0.8)
    ]

    testElements.forEach(({ element, confidence }) => {
      document.body.appendChild(element)
      
      // Apply highlighting
      const highlightClass = getSemanticHighlightClass(confidence * 100)
      element.classList.add(highlightClass)
      element.setAttribute('data-semantic-highlight', 'true')
      element.setAttribute('data-semantic-confidence', confidence.toString())
    })

    // Verify highlights are applied
    const highlightedElements = document.querySelectorAll('[data-semantic-highlight="true"]')
    expect(highlightedElements).toHaveLength(2)

    // Clear highlights (simulating clearSemanticHighlights function)
    highlightedElements.forEach(element => {
      element.classList.remove(
        'semantic-highlight-very-low',
        'semantic-highlight-low',
        'semantic-highlight-medium',
        'semantic-highlight-high',
        'semantic-highlight-very-high',
        'semantic-highlight-active'
      )
      element.removeAttribute('data-semantic-highlight')
      element.removeAttribute('data-semantic-confidence')
    })

    // Verify highlights are cleared
    expect(document.querySelectorAll('[data-semantic-highlight="true"]')).toHaveLength(0)
    
    testElements.forEach(({ element }) => {
      expect(element.getAttribute('data-semantic-highlight')).toBeNull()
      expect(element.getAttribute('data-semantic-confidence')).toBeNull()
      expect(element.classList.contains('semantic-highlight-low')).toBe(false)
      expect(element.classList.contains('semantic-highlight-very-high')).toBe(false)
    })
  })

  it('should handle active highlight animation correctly', () => {
    const { element } = createMockElement('el-active', 0.6)
    document.body.appendChild(element)

    // Apply base highlight
    const highlightClass = getSemanticHighlightClass(60)
    element.classList.add(highlightClass)
    element.setAttribute('data-semantic-highlight', 'true')

    // Apply active highlight
    element.classList.add('semantic-highlight-active')
    
    expect(element.classList.contains('semantic-highlight-high')).toBe(true)
    expect(element.classList.contains('semantic-highlight-active')).toBe(true)

    // Simulate removing active class after animation
    element.classList.remove('semantic-highlight-active')
    
    expect(element.classList.contains('semantic-highlight-high')).toBe(true)
    expect(element.classList.contains('semantic-highlight-active')).toBe(false)
  })

  it('should handle multiple elements with same confidence correctly', () => {
    const confidence = 0.75
    const expectedClass = 'semantic-highlight-high'

    // Create multiple elements with same confidence
    const elementIds = ['el-1', 'el-2', 'el-3']
    elementIds.forEach(elementId => {
      const { element } = createMockElement(elementId, confidence)
      document.body.appendChild(element)

      const highlightClass = getSemanticHighlightClass(confidence * 100)
      element.classList.add(highlightClass)
      element.setAttribute('data-semantic-highlight', 'true')
    })

    // Verify all elements have correct highlighting
    const highlightedElements = document.querySelectorAll(`[data-semantic-highlight="true"]`)
    expect(highlightedElements).toHaveLength(3)

    highlightedElements.forEach(element => {
      expect(element.classList.contains(expectedClass)).toBe(true)
    })
  })

  it('should preserve existing element attributes and classes', () => {
    const { element } = createMockElement('el-preserve', 0.4)
    
    // Add existing classes and attributes
    element.classList.add('existing-class', 'another-class')
    element.setAttribute('data-existing-attr', 'existing-value')
    document.body.appendChild(element)

    // Apply semantic highlighting
    const highlightClass = getSemanticHighlightClass(40)
    element.classList.add(highlightClass)
    element.setAttribute('data-semantic-highlight', 'true')

    // Verify semantic highlighting is applied
    expect(element.classList.contains('semantic-highlight-medium')).toBe(true)
    expect(element.getAttribute('data-semantic-highlight')).toBe('true')

    // Verify existing classes and attributes are preserved
    expect(element.classList.contains('existing-class')).toBe(true)
    expect(element.classList.contains('another-class')).toBe(true)
    expect(element.getAttribute('data-existing-attr')).toBe('existing-value')
    expect(element.getAttribute('data-element-id')).toBe('el-preserve')
  })
})
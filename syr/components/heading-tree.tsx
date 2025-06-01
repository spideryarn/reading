'use client'

import { useMemo } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { CaretRight, CaretDown } from '@phosphor-icons/react'

// Types
export interface Heading {
  id: string
  text: string
  level: number
  elementId: string  // The syr-* element ID for reliable lookup
}

export interface HeadingNode extends Heading {
  children: HeadingNode[]
}

interface ThemeColors {
  hover: string
  text: string
  levelText: string
  levelTextHover: string
}

interface HeadingTreeProps {
  headings: Heading[]
  themeColors: ThemeColors
  onHeadingClick: (heading: Heading) => void
  getTooltipContent: (elementId: string) => JSX.Element
  handleTooltipShow: (elementId: string) => void
  collapsedIds: Set<string>
  onToggleExpanded: (headingId: string) => void
  granularityLevel: number
  onGranularityChange: (level: number) => void
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
}

/**
 * Build a hierarchical tree structure from a flat array of headings.
 * Headings are nested based on their level property.
 */
export function buildHeadingTree(headings: Heading[]): HeadingNode[] {
  const roots: HeadingNode[] = []
  const stack: { node: HeadingNode; level: number }[] = []

  for (const heading of headings) {
    const node: HeadingNode = {
      ...heading,
      children: []
    }

    // Pop items from stack that are at the same level or higher
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      // This is a root node
      roots.push(node)
    } else {
      // This is a child of the last item in the stack
      stack[stack.length - 1].node.children.push(node)
    }

    // Push this node onto the stack
    stack.push({ node, level: heading.level })
  }

  return roots
}

/**
 * Get appropriate indentation and styling based on heading level
 */
function getIndentClass(level: number): string {
  const indents = {
    1: 'pl-0',
    2: 'pl-3', 
    3: 'pl-6',
    4: 'pl-9',
    5: 'pl-12',
    6: 'pl-15'
  }
  return indents[level as keyof typeof indents] || 'pl-0'
}

function getTextSizeClass(level: number): string {
  const sizes = {
    1: 'text-base font-bold',
    2: 'text-sm font-semibold', 
    3: 'text-sm font-medium',
    4: 'text-sm font-normal',
    5: 'text-xs font-normal',
    6: 'text-xs font-normal'
  }
  return sizes[level as keyof typeof sizes] || 'text-sm font-normal'
}


/**
 * Count total descendants that would be hidden by granularity filtering
 */
function countHiddenDescendants(node: HeadingNode, granularityLevel: number): number {
  let count = 0
  
  // Count all descendants recursively
  for (const child of node.children) {
    if (child.level > granularityLevel) {
      // This child and all its descendants are hidden
      count += 1 + countTotalDescendants(child)
    } else {
      // This child is visible, but some of its descendants might be hidden
      count += countHiddenDescendants(child, granularityLevel)
    }
  }
  
  return count
}

/**
 * Count total number of descendants (all levels)
 */
function countTotalDescendants(node: HeadingNode): number {
  let count = 0
  for (const child of node.children) {
    count += 1 + countTotalDescendants(child)
  }
  return count
}

/**
 * Render a single heading node and its children recursively
 */
function HeadingNodeComponent({
  node,
  themeColors,
  onHeadingClick,
  getTooltipContent,
  handleTooltipShow,
  collapsedIds,
  onToggleExpanded,
  granularityLevel,
  headingVisibility
}: {
  node: HeadingNode
  themeColors: ThemeColors
  onHeadingClick: (heading: Heading) => void
  getTooltipContent: (elementId: string) => JSX.Element
  handleTooltipShow: (elementId: string) => void
  collapsedIds: Set<string>
  onToggleExpanded: (headingId: string) => void
  granularityLevel: number
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = !collapsedIds.has(node.id)
  
  // Don't render if this node is beyond the granularity level
  if (node.level > granularityLevel) {
    return null
  }
  
  // Calculate hidden count for this node
  const hiddenCount = countHiddenDescendants(node, granularityLevel)
  const displayHiddenCount = hiddenCount > 0 ? (hiddenCount > 99 ? '99+' : hiddenCount.toString()) : null
  
  // Determine visibility state
  const visibility = headingVisibility?.get(node.id) || 'not-visible'
  const isVisible = visibility === 'visible'
  
  return (
    <>
      <div className={`flex items-center ${getIndentClass(node.level)}`}>
        
        <Tooltip.Provider delayDuration={500}>
          <Tooltip.Root onOpenChange={(open) => {
            if (open) handleTooltipShow(node.elementId)
          }}>
            <Tooltip.Trigger asChild>
              <div
                className={`cursor-pointer rounded-lg px-3 py-3 transition-all duration-150 group flex-1 ${
                  themeColors.hover
                } ${
                  isVisible 
                    ? 'ring-1 ring-blue-200 bg-blue-50/50 shadow-sm' 
                    : 'hover:shadow-sm'
                }`}
                onClick={() => onHeadingClick(node)}
                data-heading-id={node.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className={`${getTextSizeClass(node.level)} leading-relaxed ${
                      isVisible 
                        ? 'text-blue-900' 
                        : `text-gray-800 ${themeColors.text}`
                    }`}>
                      {node.text}
                    </span>
                    {displayHiddenCount && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium">
                        +{displayHiddenCount}
                      </span>
                    )}
                  </div>
                  
                  {/* Expand/collapse button for non-leaf nodes - moved to right */}
                  {hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpanded(node.id)
                      }}
                      className="ml-2 p-1 rounded-md hover:bg-gray-100 transition-all duration-150 flex-shrink-0"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                    >
                      {isExpanded ? (
                        <CaretDown size={16} className="text-gray-500 hover:text-gray-700" />
                      ) : (
                        <CaretRight size={16} className="text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="right"
                align="start"
                sideOffset={4}
                className="z-50 max-w-md"
              >
                {getTooltipContent(node.elementId)}
                <Tooltip.Arrow 
                  className="fill-gray-300" 
                  width={12} 
                  height={6}
                />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      
      {/* Render children only if expanded */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <HeadingNodeComponent
              key={child.id}
              node={child}
              themeColors={themeColors}
              onHeadingClick={onHeadingClick}
              getTooltipContent={getTooltipContent}
              handleTooltipShow={handleTooltipShow}
              collapsedIds={collapsedIds}
              onToggleExpanded={onToggleExpanded}
              granularityLevel={granularityLevel}
              headingVisibility={headingVisibility}
            />
          ))}
        </div>
      )}
    </>
  )
}

/**
 * HeadingTree component that renders a hierarchical list of headings
 * with tooltips and click handlers. Converts flat heading array to tree structure.
 */
export function HeadingTree({
  headings,
  themeColors,
  onHeadingClick,
  getTooltipContent,
  handleTooltipShow,
  collapsedIds,
  onToggleExpanded,
  granularityLevel,
  onGranularityChange,
  headingVisibility
}: HeadingTreeProps) {
  // Build tree structure from flat headings array
  const headingTree = useMemo(() => buildHeadingTree(headings), [headings])
  
  // Calculate max depth for slider
  const maxDepth = useMemo(() => {
    if (headings.length === 0) return 1
    return Math.max(...headings.map(h => h.level))
  }, [headings])
  
  // Only show granularity control if there are multiple levels
  const showGranularityControl = maxDepth > 1

  if (headings.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No headings found in document
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Headings Navigation - takes remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <nav className="space-y-1 px-4 pt-3 pb-4">
        {headingTree.map((node) => (
          <HeadingNodeComponent
            key={node.id}
            node={node}
            themeColors={themeColors}
            onHeadingClick={onHeadingClick}
            getTooltipContent={getTooltipContent}
            handleTooltipShow={handleTooltipShow}
            collapsedIds={collapsedIds}
            onToggleExpanded={onToggleExpanded}
            granularityLevel={granularityLevel}
            headingVisibility={headingVisibility}
          />
        ))}
        </nav>
      </div>
      
      {/* Granularity Slider - fixed at bottom, only show if multiple levels */}
      {showGranularityControl && (
        <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-gray-100/50 border-t border-gray-200 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">
              Showing levels 1-{Math.min(granularityLevel, maxDepth)}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-white rounded text-gray-600 font-medium shadow-sm">
              {headings.length}
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="1"
              max={maxDepth}
              value={Math.min(granularityLevel, maxDepth)}
              onChange={(e) => onGranularityChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-modern"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((Math.min(granularityLevel, maxDepth) - 1) / (maxDepth - 1)) * 100}%, #E5E7EB ${((Math.min(granularityLevel, maxDepth) - 1) / (maxDepth - 1)) * 100}%, #E5E7EB 100%)`
              }}
            />
            {/* Custom slider thumb styling */}
            <style jsx>{`
              .slider-modern::-webkit-slider-thumb {
                appearance: none;
                height: 16px;
                width: 16px;
                border-radius: 50%;
                background: #3B82F6;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                border: 2px solid white;
              }
              .slider-modern::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
              }
              .slider-modern::-moz-range-thumb {
                height: 16px;
                width: 16px;
                border-radius: 50%;
                background: #3B82F6;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
            `}</style>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-500 font-medium">1</span>
            <span className="text-xs text-gray-500 font-medium">{maxDepth}</span>
          </div>
        </div>
      )}
    </div>
  )
}
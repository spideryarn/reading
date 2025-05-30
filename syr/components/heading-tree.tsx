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
  handleTooltipShow: (elementId: string, headingText: string) => void
  collapsedIds: Set<string>
  onToggleExpanded: (headingId: string) => void
  granularityLevel: number
  onGranularityChange: (level: number) => void
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
 * Get appropriate indentation class based on heading level
 */
function getIndentClass(level: number): string {
  const indents = {
    1: 'pl-0',
    2: 'pl-4',
    3: 'pl-8',
    4: 'pl-12',
    5: 'pl-16',
    6: 'pl-20'
  }
  return indents[level as keyof typeof indents] || 'pl-0'
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
  granularityLevel
}: {
  node: HeadingNode
  themeColors: ThemeColors
  onHeadingClick: (heading: Heading) => void
  getTooltipContent: (elementId: string) => JSX.Element
  handleTooltipShow: (elementId: string, headingText: string) => void
  collapsedIds: Set<string>
  onToggleExpanded: (headingId: string) => void
  granularityLevel: number
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
  
  return (
    <>
      <div className={`flex items-center ${getIndentClass(node.level)}`}>
        {/* Expand/collapse button for non-leaf nodes */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpanded(node.id)
            }}
            className="mr-1 p-0.5 rounded hover:bg-gray-100 transition-colors"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? (
              <CaretDown size={16} className="text-gray-600" />
            ) : (
              <CaretRight size={16} className="text-gray-600" />
            )}
          </button>
        )}
        
        {/* Spacer for leaf nodes to maintain alignment */}
        {!hasChildren && <div className="w-6 mr-1" />}
        
        <Tooltip.Provider delayDuration={500}>
          <Tooltip.Root onOpenChange={(open) => {
            if (open) handleTooltipShow(node.elementId, node.text)
          }}>
            <Tooltip.Trigger asChild>
              <div
                className={`cursor-pointer rounded px-2 py-1 transition-colors group flex-1 ${themeColors.hover}`}
                onClick={() => onHeadingClick(node)}
              >
                <span className={`text-xs mr-2 ${themeColors.levelText}`}>
                  H{node.level}
                </span>
                <span className={`text-sm text-gray-700 ${themeColors.text}`}>
                  {node.text}
                </span>
                {displayHiddenCount && (
                  <span className="ml-2 text-xs text-gray-500">
                    (+{displayHiddenCount} hidden)
                  </span>
                )}
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
        <div className="ml-6">
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
  onGranularityChange
}: HeadingTreeProps) {
  // Build tree structure from flat headings array
  const headingTree = useMemo(() => buildHeadingTree(headings), [headings])
  
  // Calculate max depth for slider
  const maxDepth = useMemo(() => {
    if (headings.length === 0) return 1
    return Math.max(...headings.map(h => h.level))
  }, [headings])

  if (headings.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No headings found in document
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Granularity Slider */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">
            Showing levels 1-{Math.min(granularityLevel, maxDepth)}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max={maxDepth}
          value={Math.min(granularityLevel, maxDepth)}
          onChange={(e) => onGranularityChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: maxDepth > 1 
              ? `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((Math.min(granularityLevel, maxDepth) - 1) / (maxDepth - 1)) * 100}%, #E5E7EB ${((Math.min(granularityLevel, maxDepth) - 1) / (maxDepth - 1)) * 100}%, #E5E7EB 100%)`
              : '#3B82F6'
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">1</span>
          <span className="text-xs text-gray-400">{maxDepth}</span>
        </div>
      </div>
      
      {/* Headings Navigation */}
      <nav className="space-y-1 px-4">
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
        />
      ))}
      </nav>
    </div>
  )
}
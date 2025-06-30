export function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim()

  // Detect opening fence with optional language tag (e.g., ```json) at the very start
  const fenceStartRegex = /^```[a-z0-9]*\s*\n?/i
  const fenceEndRegex = /\n?```\s*$/

  let result = trimmed.replace(fenceStartRegex, '')
  result = result.replace(fenceEndRegex, '')
  return result.trim()
} 
/**
 * Safe JSON sanitisation helpers
 *
 * Provides utilities to transform arbitrary JavaScript values into
 * JSON-serialisable data by:
 *   • Converting `Date` instances to ISO strings
 *   • Omitting functions and symbols
 *   • Replacing circular references with a placeholder string (default: "[Circular]")
 *
 * The implementation is intentionally strict – it does *not* attempt to
 * serialise functions, `BigInt`, `Map`, `Set`, etc.  Unsupported values are
 * coerced to `null` or stringified via `String(value)` so that callers always
 * receive data that `JSON.stringify` accepts without throwing.
 */

export interface SafeJsonOptions {
  /** Placeholder used when a circular reference is encountered. */
  placeholder?: string
  /**
   * Optional callback invoked whenever a circular reference is detected.
   * Can be used for logging / debugging.  Receives the object keys at the
   * cycle root and the traversal path (dot-notation segments) that led to the
   * duplicate reference.
   */
  onCircular?: (info: { path: string[]; keys: string[] }) => void
}

/**
 * Recursively sanitise a value for safe JSON serialisation.
 *
 * @param value   Arbitrary JS value
 * @param options Behaviour customisation
 * @param seen    WeakSet used internally to track visited objects
 * @param path    Traversal path used for diagnostics
 * @returns       JSON-serialisable clone of the input
 */
export function safeJsonValue(
  value: unknown,
  options: SafeJsonOptions = {},
  seen: WeakSet<object> = new WeakSet(),
  path: string[] = []
): unknown {
  const { placeholder = '[Circular]', onCircular } = options

  // Primitives & null
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  // Dates → ISO strings
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Arrays – sanitize each element (keep same WeakSet for cycle detection)
  if (Array.isArray(value)) {
    return value.map((item, idx) => safeJsonValue(item, options, seen, path.concat(String(idx))))
  }

  // Non-object values (functions, symbols, etc.)
  if (typeof value !== 'object') {
    // For unsupported primitive‐like types, coerce to string.
    return String(value)
  }

  // Objects – handle circular refs
  if (seen.has(value as object)) {
    onCircular?.({ path, keys: Object.keys(value as Record<string, unknown>) })
    return placeholder
  }
  seen.add(value as object)

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    // Skip non-serialisable properties
    if (typeof val === 'function' || typeof val === 'symbol') continue
    result[key] = safeJsonValue(val, options, seen, path.concat(key))
  }
  return result
}

/**
 * Convenience wrapper that sanitises a value *and* returns a JSON string.
 */
export function safeJsonStringify(value: unknown, options?: SafeJsonOptions): string {
  return JSON.stringify(safeJsonValue(value, options))
} 
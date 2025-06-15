// Mock for nuqs ESM-only package to work with Jest
// This provides test-compatible implementations of nuqs functions

export const parseAsString = {
  withDefault: (defaultValue: string) => ({
    parseServerSide: () => defaultValue,
    serialize: (value: string) => value,
    parse: (value: string | null) => value || defaultValue
  })
}

export const parseAsBoolean = {
  withDefault: (defaultValue: boolean) => ({
    parseServerSide: () => defaultValue,
    serialize: (value: boolean) => String(value),
    parse: (value: string | null) => value === 'true' ? true : value === 'false' ? false : defaultValue
  })
}

export const parseAsStringEnum = <T extends string>(values: readonly T[]) => ({
  withDefault: (defaultValue: T) => ({
    parseServerSide: () => defaultValue,
    serialize: (value: T) => value,
    parse: (value: string | null) => values.includes(value as T) ? value as T : defaultValue
  })
})

// Mock hooks
export const useQueryState = (key: string, parser: any) => {
  const [value, setValue] = [parser.parseServerSide(), (_: any) => {}]
  return [value, setValue] as const
}

export const useQueryStates = (parsers: any) => {
  const values: any = {}
  const setters: any = {}
  
  Object.entries(parsers).forEach(([key, parser]: [string, any]) => {
    values[key] = parser.parseServerSide()
    setters[key] = (_: any) => {}
  })
  
  return [values, setters] as const
}

// Export cache constants
export const cache = {
  none: 'none',
  parser: 'parser',
  all: 'all'
} as const
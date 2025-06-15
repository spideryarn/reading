// Mock for nuqs ESM-only package to work with Jest
// This provides test-compatible implementations of nuqs functions

// Mock React state
const { useState } = require('react')

export const parseAsString = {
  // Base parser without default (returns null when no value)
  parseServerSide: () => null,
  serialize: (value: string | null) => value || '',
  parse: (value: string | null) => value,
  default: null,
  
  withDefault: (defaultValue: string | undefined) => ({
    parseServerSide: () => defaultValue,
    serialize: (value: string) => value,
    parse: (value: string | null) => value || defaultValue,
    default: defaultValue
  })
}

export const parseAsBoolean = {
  // Base parser without default (returns null when no value)
  parseServerSide: () => null,
  serialize: (value: boolean | null) => value !== null ? String(value) : '',
  parse: (value: string | null) => value === 'true' ? true : value === 'false' ? false : null,
  default: null,
  
  withDefault: (defaultValue: boolean) => ({
    parseServerSide: () => defaultValue,
    serialize: (value: boolean) => String(value),
    parse: (value: string | null) => value === 'true' ? true : value === 'false' ? false : defaultValue,
    default: defaultValue
  })
}

export const parseAsStringEnum = <T extends string>(values: readonly T[]) => ({
  // Base parser without default (returns null when no value)
  parseServerSide: () => null,
  serialize: (value: T | null) => value || '',
  parse: (value: string | null) => values.includes(value as T) ? value as T : null,
  default: null,
  
  withDefault: (defaultValue: T) => ({
    parseServerSide: () => defaultValue,
    serialize: (value: T) => value,
    parse: (value: string | null) => values.includes(value as T) ? value as T : defaultValue,
    default: defaultValue
  })
})

// Mock hooks with proper React state management
export const useQueryState = (key: string, parser: any) => {
  const defaultValue = parser.default || parser.parseServerSide()
  const [value, setValue] = useState(defaultValue)
  
  const setValueWrapper = (newValue: any, options?: any) => {
    setValue(newValue)
  }
  
  return [value, setValueWrapper] as const
}

export const useQueryStates = (parsers: any) => {
  const values: any = {}
  const setters: any = {}
  
  Object.entries(parsers).forEach(([key, parser]: [string, any]) => {
    const defaultValue = parser.default || parser.parseServerSide()
    const [value, setValue] = useState(defaultValue)
    values[key] = value
    setters[key] = setValue
  })
  
  const setAllValues = (updates: any, options?: any) => {
    Object.entries(updates).forEach(([key, value]) => {
      if (setters[key]) {
        setters[key](value)
      }
    })
  }
  
  return [values, setAllValues] as const
}

// Export cache constants
export const cache = {
  none: 'none',
  parser: 'parser',
  all: 'all'
} as const
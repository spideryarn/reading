declare module 'mark.js' {
  interface MarkOptions {
    element?: string
    className?: string
    exclude?: string[]
    separateWordSearch?: boolean
    accuracy?: 'partially' | 'complementary' | 'exactly'
    diacritics?: boolean
    synonyms?: Record<string, string | string[]>
    iframes?: boolean
    iframesTimeout?: number
    across?: boolean
    acrossElements?: boolean
    caseSensitive?: boolean
    ignoreJoiners?: boolean
    ignorePunctuation?: string | string[]
    wildcards?: 'disabled' | 'enabled' | 'withSpaces'
    each?: (element: Element) => void
    filter?: (node: Node, term: string, totalMatches: number) => boolean
    noMatch?: () => void
    done?: (totalMatches: number) => void
    debug?: boolean
    log?: any
  }

  class Mark {
    constructor(context: string | HTMLElement | HTMLElement[] | NodeList | Node)
    mark(keyword: string | string[], options?: MarkOptions): void
    markRegExp(regexp: RegExp, options?: MarkOptions): void
    markRanges(ranges: Array<{ start: number; length: number }>, options?: MarkOptions): void
    unmark(options?: MarkOptions): void
  }

  export = Mark
}
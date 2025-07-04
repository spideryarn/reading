import type { DocumentElement } from '@/lib/types/document'

/**
 * Serialise a list of `DocumentElement` objects back into an HTML string that
 * preserves `id` attributes – this is the form expected by the headings LLM
 * prompt.  We keep the implementation deliberately minimal and predictable: we
 * output each element on its own line, include the `id` attribute explicitly
 * (even if it is already present in `attributes`) and copy across any other
 * attributes verbatim.
 */
export function documentElementsToHtml(elements: DocumentElement[]): string {
  return elements
    .map((el) => {
      const attrs = Object.entries(el.attributes ?? {})
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ')

      // Always include the canonical id attribute first so it is easy to spot
      // and so that duplicate-id detection on the server side only has to look
      // at one place.
      const attrString = attrs ? ` id="${el.id}" ${attrs}` : ` id="${el.id}"`

      if (el.content) {
        return `<${el.tag_name}${attrString}>${el.content}</${el.tag_name}>`
      }

      // Self-closing tag for empty content (this rarely happens for headings
      // but keeps the helper generic for any element type).
      return `<${el.tag_name}${attrString} />`
    })
    .join('\n')
} 
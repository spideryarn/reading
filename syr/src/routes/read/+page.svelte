<script lang="ts">
  import { onMount } from 'svelte';
  import { inview } from 'svelte-inview';
  import { writable, derived } from 'svelte/store';
  
  interface Heading {
    text: string;
    level: number;
    id: string;
  }

  type HeadingState = 'visible' | 'above' | 'below' | null;
  
  let content = '';
  let headings: Heading[] = [];
  const visibleHeadingIds = writable(new Set<string>());
  const closestAboveId = writable<string | null>(null);
  const isBeforeFirstHeading = writable(false);
  const isAfterLastHeading = writable(false);
  
  function getHeadingState(headingId: string): HeadingState {
    if ($visibleHeadingIds.has(headingId)) return 'visible';
    if (headingId === $closestAboveId) return 'above';
    if ($isAfterLastHeading && headingId === headings[headings.length - 1]?.id) return 'below';
    return null;
  }

  function updateHeadingStates(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
    // Update visible headings
    const newVisibleHeadings = new Set($visibleHeadingIds);
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        newVisibleHeadings.add(entry.target.id);
      } else {
        newVisibleHeadings.delete(entry.target.id);
      }
    });
    visibleHeadingIds.set(newVisibleHeadings);

    // If no headings are visible, find the closest heading above
    if (newVisibleHeadings.size === 0) {
      const viewportTop = window.scrollY;
      let closest = null;
      let minDistance = Infinity;

      headings.forEach(heading => {
        const element = document.getElementById(heading.id);
        if (element) {
          const distance = viewportTop - element.offsetTop;
          if (distance > 0 && distance < minDistance) {
            minDistance = distance;
            closest = heading.id;
          }
        }
      });

      closestAboveId.set(closest);
    } else {
      closestAboveId.set(null);
    }

    // Check if we're before first heading
    const firstHeading = document.getElementById(headings[0]?.id);
    isBeforeFirstHeading.set(
      firstHeading ? window.scrollY < firstHeading.offsetTop : false
    );

    // Check if we're after last heading
    const lastHeading = document.getElementById(headings[headings.length - 1]?.id);
    isAfterLastHeading.set(
      lastHeading ? 
        window.scrollY + window.innerHeight > lastHeading.offsetTop + lastHeading.offsetHeight : 
        false
    );

    // Debug output
    console.log({
      visibleHeadings: Array.from(newVisibleHeadings),
      closestAbove: $closestAboveId,
      beforeFirst: firstHeading ? window.scrollY < firstHeading.offsetTop : false,
      afterLast: lastHeading ? 
        window.scrollY + window.innerHeight > lastHeading.offsetTop + lastHeading.offsetHeight : 
        false,
      scrollY: window.scrollY,
      firstHeadingTop: firstHeading?.offsetTop
    });
  }
  
  onMount(async () => {
    const response = await fetch('/examples/Chalmers (1995) - Facing Up to the Problem of Consciousness.html');
    const text = await response.text();
    content = text;
    headings = extractHeadings(text);
    
    // Add IDs to the actual content headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      if (!heading.id) {
        heading.id = (heading.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
    });
    content = doc.body.innerHTML;

    // Setup observers after content is rendered
    setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => updateHeadingStates(entries, observer),
        {
          root: null,
          rootMargin: '-10% 0px -70% 0px',
          threshold: 0
        }
      );

      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
        observer.observe(heading);
      });

      // Initial state update and scroll listener
      updateHeadingStates([], observer);
      window.addEventListener('scroll', () => {
        requestAnimationFrame(() => updateHeadingStates([], observer));
      });
    }, 100); // Increased timeout to ensure DOM is ready
  });
  
  function extractHeadings(htmlContent: string): Heading[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    return Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(heading => ({
      text: heading.textContent || '',
      level: parseInt(heading.tagName.charAt(1)),
      id: heading.id || (heading.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }));
  }
</script>

<div class="flex h-screen">
  <!-- Fixed Table of Contents Sidebar -->
  <nav 
    class="fixed top-0 left-0 w-64 h-screen overflow-y-auto p-4 border-r border-gray-200 bg-white"
  >
    <h2 class="text-lg font-semibold mb-4">Table of Contents</h2>
    {#if $isBeforeFirstHeading}
      <div class="text-sm text-gray-500 mb-2 pl-2">Start of document</div>
    {/if}
    <ul class="space-y-2">
      {#each headings as heading}
        <li style="margin-left: {(heading.level - 1) * 1}rem">
          <a 
            href="#{heading.id}" 
            class="block py-1 flex items-center gap-2"
          >
            <span class="text-gray-400 w-4">
              {#if getHeadingState(heading.id) === 'visible'}▶
              {:else if getHeadingState(heading.id) === 'above'}▼
              {:else if getHeadingState(heading.id) === 'below'}▲
              {/if}
            </span>
            <span class="text-gray-700 hover:text-gray-900 hover:underline">
              {heading.text}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <!-- Main Content with offset for sidebar -->
  <div class="ml-64 flex-grow">
    <div class="reader">
      {@html content}
    </div>
  </div>
</div>

<style>
  .reader {
    max-width: 65ch;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #2c3e50;
  }

  :global(.reader h1) {
    font-size: 2rem;
    margin: 2rem 0 1rem;
    color: #1a202c;
  }

  :global(.reader p) {
    margin: 1rem 0;
  }

  :global(.reader blockquote) {
    border-left: 4px solid #e2e8f0;
    margin: 1.5rem 0;
    padding-left: 1rem;
    font-style: italic;
  }

  :global(.reader em) {
    font-style: italic;
  }

  :global(.reader strong) {
    font-weight: 600;
  }

  :global(.reader ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  :global(.reader li) {
    margin: 0.5rem 0;
  }

  @media (max-width: 768px) {
    .reader {
      padding: 0 1rem;
      margin: 1rem auto;
    }
  }
</style> 
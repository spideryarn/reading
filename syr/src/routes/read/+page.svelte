<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Heading {
    text: string;
    level: number;
    id: string;
  }
  
  let content = '';
  let headings: Heading[] = [];
  
  function extractHeadings(htmlContent: string): Heading[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    return Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(heading => ({
      text: heading.textContent || '',
      level: parseInt(heading.tagName.charAt(1)),
      id: heading.id || (heading.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }));
  }
  
  onMount(async () => {
    // const response = await fetch('/examples/Rhizome - 1000 Plateaus introduction - Lambert says yes 231210.html');
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
  });
</script>

<div class="flex h-screen">
  <!-- Fixed Table of Contents Sidebar -->
  <nav class="fixed top-0 left-0 w-64 h-screen overflow-y-auto p-4 border-r border-gray-200 bg-white">
    <h2 class="text-lg font-semibold mb-4">Table of Contents</h2>
    <ul class="space-y-2">
      {#each headings as heading}
        <li style="margin-left: {(heading.level - 1) * 1}rem">
          <a 
            href="#{heading.id}" 
            class="text-gray-700 hover:text-gray-900 hover:underline block py-1"
          >
            {heading.text}
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
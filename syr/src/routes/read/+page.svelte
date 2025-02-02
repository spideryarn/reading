<script>
  import { onMount } from 'svelte';
  
  let content = '';
  
  onMount(async () => {
    const response = await fetch('/examples/Rhizome - 1000 Plateaus introduction - Lambert says yes 231210.html');
    const text = await response.text();
    content = text;
  });
</script>

<div class="reader">
  {@html content}
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
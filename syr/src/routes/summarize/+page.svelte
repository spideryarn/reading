<!-- src/routes/summarize/+page.svelte -->
<script lang="ts">
    let inputText = '';
    let summary = '';
    let error = '';
    let isLoading = false;

    async function handleSummarize() {
        if (!inputText.trim()) {
            error = 'Please enter some text to summarize';
            return;
        }

        error = '';
        isLoading = true;

        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: inputText }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to summarize text');
            }

            summary = data.summary;
        } catch (e) {
            error = e instanceof Error ? e.message : 'An unexpected error occurred';
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="max-w-2xl mx-auto p-4 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Text Summarizer</h1>

    <div class="space-y-2">
        <label for="input" class="block font-medium">Enter your text:</label>
        <textarea
            id="input"
            bind:value={inputText}
            class="w-full h-40 p-2 border rounded-md"
            placeholder="Enter text to summarize..."
        />
    </div>

    <button
        on:click={handleSummarize}
        disabled={isLoading}
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
    >
        {isLoading ? 'Summarizing...' : 'Summarize'}
    </button>

    {#if error}
        <div class="p-4 bg-red-100 text-red-700 rounded-md">
            {error}
        </div>
    {/if}

    {#if summary}
        <div class="space-y-2">
            <h2 class="text-xl font-semibold">Summary:</h2>
            <div class="p-4 bg-gray-100 rounded-md">
                {summary}
            </div>
        </div>
    {/if}
</div> 
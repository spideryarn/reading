# User question

Is there a best practice for how to use Claude in an API to edit a document (in this case HTML), e.g. to make small changes here and there? I know we could just ask Claude to rewrite the whole thing, but that will use up a lot of output tokens.

Search the web

----

# Response

Based on my search of current best practices, there are several excellent strategies for using Claude's API to efficiently edit documents like HTML while minimizing token usage:

## **Latest Token-Saving Features**

Anthropic recently released several updates to the API that let developers significantly increase throughput and reduce token usage with Claude 3.7 Sonnet. These include: cache-aware rate limits, simpler prompt caching, and token-efficient tool use.

### **1. Use the New Text Editor Tool**

Anthropic introduced a new text_editor tool, designed for applications where users collaborate with Claude on documents. With the new tool, Claude can make targeted edits to specific portions of text within source code, documents, or research reports. This reduces token consumption and latency, all while increasing accuracy.

The text editor tool includes these efficient commands:
- `view` - to view a specified file or range, `str_replace` - execute an exact string match replacement on a file, `create` - create a new file with the specified contents, `insert` - insert new text after a specified line number, `undo_edit` - undo the last edit made to a specific file

### **2. Implement Prompt Caching**

Prompt caching allows developers to store and reuse frequently accessed context between API calls. This lets Claude maintain knowledge of large documents, instructions, or examples without sending the same information with each requestreducing costs by up to 90% and latency by up to 85% for long prompts.

## **Practical Implementation Strategies**

### **Differential/Patch-Based Approach**
Instead of sending the entire HTML document each time:

1. **Cache the base document** using prompt caching
2. **Send only the specific sections** that need editing
3. **Use `str_replace` commands** for precise changes
4. **Maintain context** through the conversation history

### **Smart Chunking Strategy**
- Break large HTML documents into logical sections (header, navigation, content blocks, footer)
- Edit one section at a time
- Use the `view` command to show Claude only the relevant portion
- Apply changes incrementally

### **Example API Implementation**
```python
# Enable token-efficient tools
headers = {
    "anthropic-version": "2023-06-01", 
    "beta": "token-efficient-tools-2025-02-19"  # New beta feature
}

# Use the text editor tool for targeted edits
tools = [{
    "type": "text_editor_20250429",
    "name": "str_replace_based_edit_tool"
}]
```

## **Additional Best Practices**

### **Context Management**
- Make sure that your inputs are concise as it can help improve efficiency
- Start new conversations for different topics, ask multiple related questions at once, and avoid re-uploading files unnecessarily

### **Batching Related Changes**
- Group similar edits together in a single API call
- Plan changes in advance to minimize back-and-forth
- Ask Claude to make a plan before coding. Explicitly tell it not to code until you've confirmed its plan looks good

### **Use Response Prefilling**
If you are using the technique of prefilling the response from Claude (filling in the beginning of Claude's response by using a final assistant role Message), Claude will respond by picking up from where you left off - this can help constrain responses and reduce unnecessary output tokens.

## **Cost-Effectiveness Tips**

1. **Leverage caching**: Cache writes cost 25% more than base input tokens, while cache reads cost 90% less
2. **Use the right model**: Claude 3.7 Sonnet offers the best balance of capability and cost for most editing tasks
3. **Set appropriate `max_tokens`**: Don't over-allocate output tokens
4. **Monitor usage**: Conduct regular performance audits: Regularly check how your API calls are performing

This approach can dramatically reduce your token consumption compared to full document rewrites while maintaining accuracy and enabling complex editing workflows.
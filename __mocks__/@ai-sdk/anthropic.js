// Mock for @ai-sdk/anthropic to prevent real API calls during testing

export const anthropic = jest.fn().mockImplementation((modelId, options = {}) => {
  // Mock model instance that returns consistent test responses
  return {
    modelId,
    options,
    // Mock the streamText functionality
    streamText: jest.fn().mockResolvedValue({
      textStream: async function* () {
        yield 'Mocked ';
        yield 'streaming ';
        yield 'response';
      },
      text: Promise.resolve('Mocked streaming response'),
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    }),
    // Mock the generateText functionality
    generateText: jest.fn().mockResolvedValue({
      text: 'Mocked AI response',
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    })
  };
});
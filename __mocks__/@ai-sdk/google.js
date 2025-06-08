// Mock for @ai-sdk/google to prevent real API calls during testing

export const google = jest.fn().mockImplementation((modelId, options = {}) => {
  // Mock model instance that returns consistent test responses
  return {
    modelId,
    options,
    // Mock the streamText functionality
    streamText: jest.fn().mockResolvedValue({
      textStream: async function* () {
        yield 'Mocked ';
        yield 'Google ';
        yield 'response';
      },
      text: Promise.resolve('Mocked Google response'),
      finishReason: 'stop',
      usage: {
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40
      }
    }),
    // Mock the generateText functionality
    generateText: jest.fn().mockResolvedValue({
      text: 'Mocked Google AI response',
      finishReason: 'stop',
      usage: {
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40
      }
    })
  };
});
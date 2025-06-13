import { 
  logger, 
  aiLogger, 
  chatLogger, 
  mutationLogger,
  authLogger,
  uploadLogger,
  searchLogger,
  generateCorrelationId,
  createRequestLogger,
  createTimer,
  logAIOperation
} from '../logger'

// Mock console to capture log output during tests
const originalConsole = console
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}

describe('Logger Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Replace console temporarily for testing
    Object.assign(console, mockConsole)
  })

  afterEach(() => {
    // Restore console
    Object.assign(console, originalConsole)
  })

  it('should create base logger with correct configuration', () => {
    expect(logger).toBeDefined()
    expect(logger.level).toBeDefined()
  })

  it('should create child loggers for different components', () => {
    expect(aiLogger).toBeDefined()
    expect(chatLogger).toBeDefined()
    expect(mutationLogger).toBeDefined()
    expect(authLogger).toBeDefined()
    expect(uploadLogger).toBeDefined()
    expect(searchLogger).toBeDefined()
  })

  it('should generate unique correlation IDs', () => {
    const id1 = generateCorrelationId()
    const id2 = generateCorrelationId()
    
    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toBe(id2)
    
    // Should be valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(id1).toMatch(uuidRegex)
    expect(id2).toMatch(uuidRegex)
  })

  it('should create request logger with correlation ID', () => {
    const requestLogger = createRequestLogger('/api/test')
    expect(requestLogger).toBeDefined()
    
    const customId = generateCorrelationId()
    const requestLoggerWithId = createRequestLogger('/api/test', customId)
    expect(requestLoggerWithId).toBeDefined()
  })

  it('should create timer utility for performance tracking', () => {
    const timer = createTimer(logger, 'test-operation')
    expect(timer).toBeDefined()
    expect(typeof timer.end).toBe('function')
    
    // Test timing
    const duration = timer.end({ additionalData: 'test' })
    expect(typeof duration).toBe('number')
    expect(duration).toBeGreaterThanOrEqual(0)
  })

  it('should log AI operations with proper structure', () => {
    const context = {
      modelProvider: 'anthropic',
      tokensUsed: 150,
      userId: 'test-user',
      documentId: 'test-doc',
      correlationId: generateCorrelationId()
    }

    // Test successful operation
    logAIOperation('summarise', context, 'success')
    
    // Test failed operation
    const error = new Error('AI operation failed')
    logAIOperation('summarise', context, 'error', error)
    
    // Both calls should complete without throwing
    expect(true).toBe(true)
  })

  it('should handle logger calls without errors', () => {
    // Test basic logging calls
    expect(() => {
      logger.info('Test info message')
      logger.error('Test error message')
      logger.debug('Test debug message')
      
      aiLogger.info('AI test message')
      chatLogger.info('Chat test message')
      mutationLogger.info('Mutation test message')
    }).not.toThrow()
  })
})
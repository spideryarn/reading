/**
 * @jest-environment node
 */
import * as backgroundRoute from '../route'
import { createMockRequest } from '@/app/api/__tests__/test-helpers'
import * as serverAuth from '@/lib/auth/server-auth'
import { createClient } from '@/lib/supabase/server'
import { ProfileService } from '@/lib/services/database/profiles'

// Mock the dependencies
jest.mock('@/lib/auth/server-auth')
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/profiles')

const mockServerAuth = serverAuth as jest.Mocked<typeof serverAuth>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockProfileService = ProfileService as jest.MockedClass<typeof ProfileService>

describe('/api/profile/background', () => {
  const mockSupabase = {} as any
  const mockProfileService = {
    updateBackground: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockResolvedValue(mockSupabase)
    MockProfileService.mockImplementation(() => mockProfileService as any)
  })

  describe('POST', () => {
    it('should update background successfully for authenticated user', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { id: 'profile-123', background: 'Updated background' }
      
      mockServerAuth.getUser.mockResolvedValue({ user: mockUser })
      mockProfileService.updateBackground.mockResolvedValue(mockProfile)

      const request = createMockRequest('http://localhost:3002/api/profile/background', {
        method: 'POST',
        body: { background: 'Updated background' },
      })

      // Act
      const response = await backgroundRoute.POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        profile: mockProfile,
      })
      expect(mockProfileService.updateBackground).toHaveBeenCalledWith(
        'user-123',
        'Updated background'
      )
    })

    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      mockServerAuth.getUser.mockResolvedValue({ user: null })

      const request = createMockRequest('http://localhost:3002/api/profile/background', {
        method: 'POST',
        body: { background: 'Some background' },
      })

      // Act
      const response = await backgroundRoute.POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockProfileService.updateBackground).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid input', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockServerAuth.getUser.mockResolvedValue({ user: mockUser })

      const request = createMockRequest('http://localhost:3002/api/profile/background', {
        method: 'POST',
        body: { background: 'x'.repeat(5001) }, // Too long
      })

      // Act
      const response = await backgroundRoute.POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Background must be less than 5000 characters')
      expect(mockProfileService.updateBackground).not.toHaveBeenCalled()
    })

    it('should handle ProfileService errors', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockServerAuth.getUser.mockResolvedValue({ user: mockUser })
      mockProfileService.updateBackground.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('http://localhost:3002/api/profile/background', {
        method: 'POST',
        body: { background: 'Some background' },
      })

      // Act
      const response = await backgroundRoute.POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })

    it('should handle empty background', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { id: 'profile-123', background: '' }
      
      mockServerAuth.getUser.mockResolvedValue({ user: mockUser })
      mockProfileService.updateBackground.mockResolvedValue(mockProfile)

      const request = createMockRequest('http://localhost:3002/api/profile/background', {
        method: 'POST',
        body: { background: '' },
      })

      // Act
      const response = await backgroundRoute.POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockProfileService.updateBackground).toHaveBeenCalledWith('user-123', '')
    })
  })
})
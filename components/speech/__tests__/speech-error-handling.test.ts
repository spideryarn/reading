/**
 * Tests for Speech-to-Text Error Handling
 * 
 * This test suite verifies that the speech-to-text functionality properly handles
 * various error scenarios including authentication, network failures, and API errors.
 */

import { renderHook, act } from '@testing-library/react'
import { useSpeechToText } from '../use-speech-to-text'

// Mock fetch globally
global.fetch = jest.fn()

// Mock MediaRecorder and getUserMedia
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null as ((event: any) => void) | null,
  onstop: null as (() => void) | null,
  onerror: null as ((event: any) => void) | null,
  state: 'inactive' as 'inactive' | 'recording' | 'paused'
}

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockMediaRecorder)
})

Object.defineProperty(MediaRecorder, 'isTypeSupported', {
  writable: true,
  value: jest.fn().mockReturnValue(true)
})

const mockGetUserMedia = jest.fn()
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
})

describe('Speech-to-Text Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock fetch
    ;(fetch as jest.Mock).mockClear()
    mockGetUserMedia.mockClear()
  })

  describe('Authentication Error Handling', () => {
    it('should handle 401 authentication errors properly', async () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      // Mock successful media setup
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      // Mock API 401 response
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Authentication required' })
      })
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // Start recording
      await act(async () => {
        await result.current.startRecording()
      })
      
      // Simulate recording completion with audio data
      await act(async () => {
        // Add some mock audio data
        const mockAudioData = new Blob(['mock audio'], { type: 'audio/webm' })
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockAudioData })
        }
        
        // Trigger stop event
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop()
        }
      })
      
      // Verify authentication error is handled correctly
      expect(mockError).toHaveBeenCalledWith(
        'Authentication required. Please log in and try again.'
      )
      expect(result.current.state.error).toBe(
        'Authentication required. Please log in and try again.'
      )
    })
  })

  describe('Network Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      // Mock successful media setup
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      // Mock network error
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // Start recording
      await act(async () => {
        await result.current.startRecording()
      })
      
      // Simulate recording completion
      await act(async () => {
        const mockAudioData = new Blob(['mock audio'], { type: 'audio/webm' })
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockAudioData })
        }
        
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop()
        }
      })
      
      // Verify network error is handled
      expect(mockError).toHaveBeenCalledWith(
        'Network error. Please check your connection and try again.'
      )
    })
  })

  describe('Rate Limit Error Handling', () => {
    it('should handle 429 rate limit errors', async () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      // Mock successful media setup
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      // Mock API 429 response
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' })
      })
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // Start recording
      await act(async () => {
        await result.current.startRecording()
      })
      
      // Simulate recording completion
      await act(async () => {
        const mockAudioData = new Blob(['mock audio'], { type: 'audio/webm' })
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockAudioData })
        }
        
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop()
        }
      })
      
      // Verify rate limit error is handled
      expect(mockError).toHaveBeenCalledWith(
        'Rate limit exceeded. Please wait a moment and try again.'
      )
    })
  })

  describe('Microphone Permission Handling', () => {
    it('should handle permission denied errors', async () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      // Mock permission denied error
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // Try to start recording
      await act(async () => {
        await result.current.startRecording()
      })
      
      // Verify permission error is handled
      expect(mockError).toHaveBeenCalledWith(
        'Microphone permission denied. Please allow microphone access and try again.'
      )
      expect(result.current.state.hasPermission).toBe(false)
    })

    it('should handle no microphone found errors', async () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      // Mock no microphone error
      const micError = new Error('No microphone found')
      micError.name = 'NotFoundError'
      mockGetUserMedia.mockRejectedValue(micError)
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // Try to start recording
      await act(async () => {
        await result.current.startRecording()
      })
      
      // Verify microphone error is handled
      expect(mockError).toHaveBeenCalledWith(
        'No microphone found. Please connect a microphone and try again.'
      )
    })
  })

  describe('Browser Support Detection', () => {
    it('should detect speech-to-text support correctly', () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // With our mocks, it should be supported
      expect(result.current.state.isSupported).toBe(true)
      
      // Test that support detection works by checking the implementation
      expect(typeof result.current.startRecording).toBe('function')
      expect(typeof result.current.stopRecording).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('Error Recovery', () => {
    it('should allow clearing errors', async () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // Simulate an error state
      await act(async () => {
        // Mock permission error
        const permissionError = new Error('Permission denied')
        permissionError.name = 'NotAllowedError'
        mockGetUserMedia.mockRejectedValue(permissionError)
        
        await result.current.startRecording()
      })
      
      // Verify error exists
      expect(result.current.state.error).toBeTruthy()
      
      // Clear the error
      act(() => {
        result.current.clearError()
      })
      
      // Verify error is cleared
      expect(result.current.state.error).toBeNull()
    })
  })

  describe('File Size Validation', () => {
    it('should handle file too large errors (413)', async () => {
      const mockTranscription = jest.fn()
      const mockError = jest.fn()
      
      // Mock successful media setup
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      // Mock API 413 response
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 413,
        json: () => Promise.resolve({ error: 'File too large' })
      })
      
      const { result } = renderHook(() => 
        useSpeechToText(mockTranscription, mockError)
      )
      
      // Start recording
      await act(async () => {
        await result.current.startRecording()
      })
      
      // Simulate recording completion
      await act(async () => {
        const mockAudioData = new Blob(['mock audio'], { type: 'audio/webm' })
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockAudioData })
        }
        
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop()
        }
      })
      
      // Verify file size error is handled
      expect(mockError).toHaveBeenCalledWith(
        'Recording too long. Please try a shorter recording.'
      )
    })
  })
})
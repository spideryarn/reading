'use client';

/**
 * Voice Input Component using react-media-recorder
 * 
 * A more robust implementation that handles browser permissions better
 * and provides both click-to-toggle and hold-to-record modes.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Button } from '@/components/ui/button';
import { Microphone, MicrophoneSlash, CircleNotch } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/utils';
import { SpeechToTextInputProps, SpeechToTextResponse } from './types';
import { useAuth } from '@/lib/context/auth-context';

/**
 * Browser-specific guidance for microphone permissions
 */
function getBrowserGuidance(): { message: string; instructions: string[] } {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  if (userAgent.includes('Chrome') || userAgent.includes('Edg')) {
    return {
      message: 'Chrome/Edge: Check microphone settings',
      instructions: [
        'Click the camera/microphone icon in the address bar',
        'Select "Allow" for microphone access',
        'Or go to chrome://settings/content/microphone',
        'Remove this site from the blocked list and refresh'
      ]
    };
  } else if (userAgent.includes('Firefox')) {
    return {
      message: 'Firefox: Check microphone settings',
      instructions: [
        'Click the shield or microphone icon in the address bar',
        'Select "Allow" for microphone access',
        'Or go to about:preferences#privacy',
        'Check microphone permissions and refresh'
      ]
    };
  } else if (userAgent.includes('Safari')) {
    return {
      message: 'Safari: Check microphone settings',
      instructions: [
        'Go to Safari > Preferences > Websites > Microphone',
        'Find this site and set to "Ask" or "Allow"',
        'Refresh the page to try again'
      ]
    };
  }
  
  return {
    message: 'Check browser microphone settings',
    instructions: [
      'Look for a microphone icon in your browser address bar',
      'Enable microphone access for this site',
      'Check browser privacy/security settings',
      'Refresh the page after changing settings'
    ]
  };
}

export function VoiceInputRecorder({ 
  onTranscription, 
  onError, 
  disabled = false, 
  className 
}: SpeechToTextInputProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Using the hook directly for more control
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
    error: recorderError,
  } = useReactMediaRecorder({ 
    audio: true,
    blobPropertyBag: {
      type: 'audio/webm'
    }
  });

  const isRecording = status === 'recording';

  // Browsers require a secure context (HTTPS) for getUserMedia().
  // All production builds are on HTTPS, but during local development we
  // often run on http://localhost.  Allow insecure context *only* for the
  // special-case hostname to avoid breaking the developer experience while
  // still blocking voice input on other insecure origins.
  const isSecureContextAllowed = typeof window !== 'undefined' && (
    window.isSecureContext || window.location.hostname === 'localhost'
  );

  const isSupported = typeof navigator !== 'undefined' &&
    navigator?.mediaDevices?.getUserMedia !== undefined &&
    isSecureContextAllowed;

  /**
   * Handle errors with consistent logging and user feedback
   */
  const handleError = useCallback((errorMessage: string, context?: Record<string, unknown>) => {
    console.warn('[VoiceInput]', errorMessage, context);
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  /**
   * Upload audio to transcription API
   */
  const transcribeAudio = useCallback(async (audioUrl: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Fetch the blob from the URL
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      // Send to transcription API (include cookies explicitly)
      const apiResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${apiResponse.status}: ${apiResponse.statusText}`;
        
        const error = new Error(errorMessage);
        (error as { status?: number }).status = apiResponse.status;
        throw error;
      }

      const data: SpeechToTextResponse = await apiResponse.json();

      if (!data.success || typeof data.text !== 'string') {
        throw new Error(data.error || 'Transcription failed');
      }

      const trimmed = data.text.trim();

      if (trimmed.length === 0) {
        handleError('No speech detected. Please try again.', { errorType: 'emptyTranscription' });
        setIsProcessing(false);
        return;
      }

      // Clear processing state and call success callback
      setIsProcessing(false);
      setError(null);
      onTranscription(trimmed);

    } catch (error) {
      setIsProcessing(false);
      
      if (error instanceof Error) {
        const status = (error as { status?: number }).status;
        
        if (status === 401 || error.message.includes('401')) {
          handleError('Authentication required. Please log in and try again.', { 
            httpStatus: status, 
            errorType: 'authentication'
          });
        } else if (status === 429 || error.message.includes('429')) {
          handleError('Rate limit exceeded. Please wait a moment and try again.', {
            httpStatus: status,
            errorType: 'rateLimit'
          });
        } else if (status === 413 || error.message.includes('413')) {
          handleError('Recording too long. Please try a shorter recording.', {
            httpStatus: status,
            errorType: 'fileSize'
          });
        } else if (error.message.includes('Network') || error.name === 'NetworkError') {
          handleError('Network error. Please check your connection and try again.', {
            errorType: 'network'
          });
        } else {
          handleError(`Transcription failed: ${error.message}`, {
            httpStatus: status,
            errorType: 'api'
          });
        }
      } else {
        handleError('Failed to transcribe audio. Please try again.');
      }
    } finally {
      // Clear the blob URL to reset for next recording
      clearBlobUrl();
    }
  }, [handleError, onTranscription, clearBlobUrl]);

  /**
   * Handle recorder errors
   */
  useEffect(() => {
    if (recorderError) {
      const browserGuidance = getBrowserGuidance();
      
      if (recorderError.includes('Permission') || recorderError.includes('NotAllowed')) {
        handleError(
          `Microphone permission denied. ${browserGuidance.message}\n\nSteps to fix:\n${browserGuidance.instructions.map(step => `• ${step}`).join('\n')}`,
          { errorType: 'permission', browserGuidance }
        );
      } else if (recorderError.includes('NotFound')) {
        handleError('No microphone found. Please connect a microphone and try again.', { 
          errorType: 'hardware' 
        });
      } else {
        handleError(`Recording error: ${recorderError}`, { 
          errorType: 'recorder' 
        });
      }
    }
  }, [recorderError, handleError]);

  /**
   * Process recording when blob URL is available
   */
  useEffect(() => {
    if (mediaBlobUrl && !isRecording) {
      transcribeAudio(mediaBlobUrl);
    }
  }, [mediaBlobUrl, isRecording, transcribeAudio]);

  /**
   * Handle click for toggle mode
   */
  const handleClick = useCallback(() => {
    if (disabled || isProcessing || !isSupported || !isAuthenticated) {
      return;
    }

    // Clear error and retry
    if (error) {
      setError(null);
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [disabled, isProcessing, isSupported, isAuthenticated, error, isRecording, startRecording, stopRecording]);

  /**
   * Handle hold-to-record mode
   */
  const handlePointerDown = useCallback(() => {
    if (disabled || isProcessing || isRecording || !isSupported || !isAuthenticated) {
      return;
    }

    // Start hold timer
    holdTimeoutRef.current = setTimeout(() => {
      setIsHolding(true);
      startRecording();
    }, 300);
  }, [disabled, isProcessing, isRecording, isSupported, isAuthenticated, startRecording]);

  const handlePointerUp = useCallback(() => {
    // Clear hold timer
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    // Stop recording if holding
    if (isHolding && isRecording) {
      stopRecording();
      setIsHolding(false);
    }
  }, [isHolding, isRecording, stopRecording]);

  const handlePointerCancel = useCallback(() => {
    // Clear hold timer
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    // Stop recording if holding
    if (isHolding && isRecording) {
      stopRecording();
      setIsHolding(false);
    }
  }, [isHolding, isRecording, stopRecording]);

  /**
   * Get appropriate icon based on state
   */
  const getIcon = () => {
    if (isProcessing) {
      return (
        <CircleNotch 
          size={18} 
          weight="bold" 
          className="animate-spin text-blue-500"
        />
      );
    }
    
    if (!isSupported || !isAuthenticated || disabled) {
      return (
        <MicrophoneSlash 
          size={18} 
          weight="bold" 
          className="text-gray-400"
        />
      );
    }
    
    return (
      <Microphone 
        size={18} 
        weight="bold" 
        className={isRecording ? 'animate-pulse text-red-500' : 'text-gray-600'}
      />
    );
  };

  /**
   * Get ARIA label for accessibility
   */
  const getAriaLabel = () => {
    if (!isSupported) {
      return 'Voice input not supported in this browser';
    }
    
    if (!isAuthenticated) {
      return 'Voice input requires authentication. Please log in.';
    }
    
    if (disabled) {
      return 'Voice input disabled';
    }
    
    if (isProcessing) {
      return 'Processing voice input...';
    }
    
    if (isRecording) {
      return 'Recording... Click to stop or release to finish';
    }
    
    if (error) {
      return `Voice input error: ${error}. Click to retry.`;
    }
    
    return 'Voice input. Click to start recording or hold to record while pressed.';
  };

  const isButtonDisabled = disabled || !isSupported || isProcessing || !isAuthenticated;

  return (
    <Button
      variant={error ? 'ghost-orange' : 'ghost'}
      size="icon"
      className={cn(
        'h-[44px] w-[44px] rounded-xl transition-all duration-200',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        isRecording && 'bg-red-50 hover:bg-red-100',
        error && 'hover:bg-orange-50',
        className
      )}
      disabled={isButtonDisabled}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={getAriaLabel()}
      aria-pressed={isRecording}
      aria-busy={isProcessing}
      title={getAriaLabel()}
    >
      {getIcon()}
      
      {/* Screen reader status announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isRecording && 'Recording audio'}
        {isProcessing && 'Processing voice input'}
        {error && `Error: ${error}`}
      </span>
    </Button>
  );
}

/**
 * Default export for easier imports
 */
export default VoiceInputRecorder;
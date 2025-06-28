'use client';

/**
 * Speech-to-Text Input Component
 * 
 * A reusable voice input button that records audio and transcribes it to text.
 * Designed for integration with chat interfaces but can be used anywhere.
 * 
 * Features:
 * - Click-to-toggle and hold-to-record interaction modes
 * - Visual feedback for recording, processing, and error states
 * - Accessibility support with ARIA labels and keyboard navigation
 * - Browser compatibility detection and graceful degradation
 * - Consistent styling with existing chat interface
 */

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Microphone, MicrophoneSlash, CircleNotch } from '@phosphor-icons/react';
import { useSpeechToText } from './use-speech-to-text';
import { useLongPress } from '@/lib/hooks/use-long-press';
import { SpeechToTextInputProps } from './types';
import { cn } from '@/lib/utils';

/**
 * CSS classes for recording pulse animation
 */
const RECORDING_PULSE_CLASSES = 'animate-pulse text-red-500';
const PROCESSING_SPIN_CLASSES = 'animate-spin text-blue-500';

export function SpeechToTextInput({ 
  onTranscription, 
  onError, 
  disabled = false, 
  className 
}: SpeechToTextInputProps) {
  const { state, startRecording, stopRecording, toggleRecording, clearError } = useSpeechToText(
    onTranscription,
    onError
  );

  // Long press handlers for hold-to-record functionality
  const longPressHandlers = useLongPress(
    useCallback(() => {
      if (!disabled && !state.isProcessing) {
        startRecording();
      }
    }, [disabled, state.isProcessing, startRecording]),
    { delay: 300 } // Shorter delay for voice input
  );

  /**
   * Handle button click for toggle recording mode
   */
  const handleClick = useCallback(() => {
    if (disabled || state.isProcessing) {
      return;
    }

    // Clear any existing errors and allow retry
    if (state.error) {
      clearError();
      // For certain errors, automatically retry after clearing
      if (state.error.includes('permission') && state.hasPermission !== true) {
        // Re-attempt recording to trigger permission request
        setTimeout(() => {
          if (!state.isRecording && !state.isProcessing) {
            startRecording();
          }
        }, 100);
      }
      return;
    }

    toggleRecording();
  }, [disabled, state.isProcessing, state.error, state.hasPermission, state.isRecording, clearError, toggleRecording, startRecording]);

  /**
   * Handle long press release for hold-to-record mode
   */
  const handleLongPressRelease = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    }
  }, [state.isRecording, stopRecording]);

  /**
   * Get appropriate icon based on current state
   */
  const getIcon = () => {
    if (state.isProcessing) {
      return (
        <CircleNotch 
          size={18} 
          weight="bold" 
          className={PROCESSING_SPIN_CLASSES}
        />
      );
    }
    
    if (!state.isSupported || state.hasPermission === false || disabled) {
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
        className={state.isRecording ? RECORDING_PULSE_CLASSES : 'text-gray-600'}
      />
    );
  };

  /**
   * Get ARIA label for accessibility
   */
  const getAriaLabel = () => {
    if (!state.isSupported) {
      return 'Voice input not supported in this browser';
    }
    
    if (state.hasPermission === false) {
      return 'Microphone access denied. Click to request permission.';
    }
    
    if (disabled) {
      return 'Voice input disabled';
    }
    
    if (state.isProcessing) {
      return 'Processing voice input...';
    }
    
    if (state.isRecording) {
      return 'Recording... Click to stop or release to finish';
    }
    
    if (state.error) {
      if (state.error.includes('permission')) {
        return `Voice input error: ${state.error}. Click to request microphone permission again.`;
      } else if (state.error.includes('Authentication')) {
        return `Voice input error: ${state.error}. Please log in and try again.`;
      } else if (state.error.includes('Network')) {
        return `Voice input error: ${state.error}. Check your connection and click to retry.`;
      } else {
        return `Voice input error: ${state.error}. Click to retry.`;
      }
    }
    
    return 'Voice input. Click to start recording or hold to record while pressed.';
  };

  /**
   * Get button variant based on state
   */
  const getButtonVariant = () => {
    if (state.error) {
      return 'ghost-orange';
    }
    
    if (state.isRecording) {
      return 'ghost';
    }
    
    return 'ghost';
  };

  /**
   * Determine if button should be disabled
   */
  const isButtonDisabled = disabled || !state.isSupported || state.isProcessing;

  return (
    <Button
      variant={getButtonVariant()}
      size="icon"
      className={cn(
        'h-[44px] w-[44px] rounded-xl transition-all duration-200',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        state.isRecording && 'bg-red-50 hover:bg-red-100',
        state.error && 'hover:bg-orange-50',
        className
      )}
      disabled={isButtonDisabled}
      onClick={handleClick}
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerUp={(e) => {
        longPressHandlers.onPointerUp();
        handleLongPressRelease();
      }}
      onPointerCancel={(e) => {
        longPressHandlers.onPointerCancel();
        handleLongPressRelease();
      }}
      onPointerMove={longPressHandlers.onPointerMove}
      onContextMenu={longPressHandlers.onContextMenu}
      aria-label={getAriaLabel()}
      aria-pressed={state.isRecording}
      aria-busy={state.isProcessing}
      title={getAriaLabel()}
    >
      {getIcon()}
      
      {/* Screen reader status announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {state.isRecording && 'Recording audio'}
        {state.isProcessing && 'Processing voice input'}
        {state.error && `Error: ${state.error}`}
      </span>
    </Button>
  );
}

/**
 * Export the component as default for easier imports
 */
export default SpeechToTextInput;
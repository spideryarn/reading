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
import { DEBUG_FLAGS } from '@/lib/config';
import { createRoot, Root } from 'react-dom/client';

// Module-level cache so we only create the React root once per page
let globalDebugRoot: Root | null = null;
let globalDebugContainer: HTMLElement | null = null;

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
    previewStream,
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
   * Debug flag – enables additional diagnostics when DEBUG_VOICE_INPUT=true.
   * Keep this outside of state so it never changes at runtime (allows tree-shaking).
   */
  const DEBUG = DEBUG_FLAGS.VOICE_INPUT;

  // Diagnostics state (only populated when DEBUG is true)
  const [debugAudioUrl, setDebugAudioUrl] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ sizeKb: number; duration: number; mime: string } | null>(null);
  const [debugRawWhisper, setDebugRawWhisper] = useState<string | null>(null);
  const [debugMicLabel, setDebugMicLabel] = useState<string | null>(null);
  const [liveLevel, setLiveLevel] = useState<number>(0);
  const [debugTrackSettings, setDebugTrackSettings] = useState<MediaTrackSettings | null>(null);
  const [debugEncodedPeak, setDebugEncodedPeak] = useState<number | null>(null);

  // Waveform drawing reference (debug only)
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
      
      if (DEBUG) {
        // Compute simple diagnostics before uploading
        const sizeKb = blob.size / 1024;

        // Determine duration via a temporary Audio element
        const getDuration = (b: Blob): Promise<number> => new Promise((resolve) => {
          const url = URL.createObjectURL(b);
          const audio = new Audio(url);
          audio.addEventListener('loadedmetadata', () => {
            // Sometimes the duration is NaN for silence; normalise to 0
            resolve(isFinite(audio.duration) ? audio.duration : 0);
            // Clean up object URL asap
            URL.revokeObjectURL(url);
          });
          audio.addEventListener('error', () => {
            resolve(0);
            URL.revokeObjectURL(url);
          });
        });

        const durationSec = await getDuration(blob);

        setDebugInfo({ sizeKb, duration: durationSec, mime: blob.type });
        setDebugAudioUrl(audioUrl);
      }

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

      if (DEBUG) {
        setDebugRawWhisper(data.text);
      }

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
  }, [handleError, onTranscription, clearBlobUrl, DEBUG]);

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

  /**
   * Draw a simple peak waveform once we have an audio URL
   */
  useEffect(() => {
    if (!DEBUG || !debugAudioUrl) return;

    let isCancelled = false;

    const drawWaveform = async () => {
      try {
        const response = await fetch(debugAudioUrl);
        const arrayBuffer = await response.arrayBuffer();

        const AudioCtxCtor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
        if (!AudioCtxCtor) return;
        const audioCtx = new (AudioCtxCtor as typeof AudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        if (isCancelled) return;

        const rawData = audioBuffer.getChannelData(0); // use first channel
        const samplePoints = 200; // horizontal resolution of waveform
        const blockSize = Math.floor(rawData.length / samplePoints);
        const peaks: number[] = [];

        for (let i = 0; i < samplePoints; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j] || 0);
          }
          peaks.push(sum / blockSize);
        }

        const canvas = waveformCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width || 0;
        const height = canvas.height || 0;
        ctx.clearRect(0, 0, width as number, height as number);
        ctx.fillStyle = '#4b5563'; // tailwind gray-600

        let maxPeak = 0;
        peaks.forEach((p, idx) => {
          const x = (idx / samplePoints) * width;
          const barWidth = 1;
          const barHeight = p * height;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore – Type libs may require integer, actual API accepts number
          ctx.fillRect(x, (height - barHeight) / 2, barWidth, Number.isFinite(barHeight) ? barHeight : 0);
          if (p > maxPeak) maxPeak = p;
        });

        setDebugEncodedPeak(maxPeak);
      } catch (err) {
        // Silent failure – waveform is just a debugging aid
        console.warn('[VoiceInputRecorder] Failed to draw waveform', err);
      }
    };

    drawWaveform();

    return () => {
      isCancelled = true;
    };
  }, [DEBUG, debugAudioUrl]);

  // Capture microphone label & settings from the actual stream being recorded
  useEffect(() => {
    if (!DEBUG) return;

    if (previewStream) {
      const track = previewStream.getAudioTracks()[0];
      if (track) {
        setDebugMicLabel(track.label || 'Unknown');
        setDebugTrackSettings(track.getSettings());
      }
    }
  }, [DEBUG, previewStream]);

  // Live level meter & track metadata
  useEffect(() => {
    if (!DEBUG || !isRecording) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let rafId: number;
    let mediaStream: MediaStream | null = null;

    const setup = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = mediaStream.getAudioTracks()[0];
        if (track) setDebugTrackSettings(track.getSettings());

        const ACtor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
        if (!ACtor) return;
        audioCtx = new ACtor();
        const source = audioCtx.createMediaStreamSource(mediaStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);
        const update = () => {
          if (!analyser) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const dataPoint = data[i];
            if (dataPoint === undefined) continue;
            const v = (dataPoint - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setLiveLevel(rms);
          rafId = requestAnimationFrame(update);
        };
        update();
      } catch (err) {
        console.warn('[VoiceInputRecorder] live meter setup failed', err);
      }
    };
    setup();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      analyser?.disconnect();
      audioCtx?.close();
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, [DEBUG, isRecording]);

  // Effect to render persistent debug panel
  useEffect(() => {
    if (!DEBUG) return;

    // Ensure container & global root exist only once
    if (!globalDebugContainer) {
      globalDebugContainer = document.createElement('div');
      globalDebugContainer.id = 'voice-debug-root';
      document.body.appendChild(globalDebugContainer);
    }

    if (!globalDebugRoot) {
      globalDebugRoot = createRoot(globalDebugContainer);
    }

    const Panel = (
      <div className="fixed bottom-4 right-4 z-[1000] w-80 max-w-[360px] rounded-md border bg-white p-3 shadow-lg">
        <div className="mb-1 text-[10px] font-semibold text-gray-700">VOICE-DEBUG</div>
        {isRecording && <div className="text-[10px] text-gray-600">Recording…</div>}
        {debugInfo && (
          <div className="text-[10px] space-y-0.5 text-gray-600">
            <div>Size: {debugInfo.sizeKb.toFixed(1)} KB</div>
            <div>Duration: {debugInfo.duration.toFixed(2)} s</div>
            <div>MIME: {debugInfo.mime || 'n/a'}</div>
            {debugMicLabel && <div>Mic: {debugMicLabel}</div>}
            {debugTrackSettings && (
              <div>
                SR: {debugTrackSettings.sampleRate ?? '–'} Hz&nbsp; /&nbsp;
                Ch: {debugTrackSettings.channelCount ?? '–'}
              </div>
            )}
          </div>
        )}
        {debugRawWhisper && (
          <div className="mt-1 max-h-24 overflow-auto rounded bg-gray-50 p-1 text-[10px] font-mono text-gray-800">
            {debugRawWhisper}
          </div>
        )}
        {debugAudioUrl && (
          <>
            <audio
              key={debugAudioUrl}
              src={debugAudioUrl}
              controls
              autoPlay
              className="mt-2 w-full"
              ref={(el) => {
                if (el) el.volume = 1.0;
              }}
            />
            <canvas
              ref={waveformCanvasRef}
              width={320}
              height={60}
              className="mt-2 w-full bg-gray-100"
            />
          </>
        )}
        {debugEncodedPeak !== null && (
          <div className="mt-1 text-[10px] text-gray-600">Encoded peak: {debugEncodedPeak.toFixed(2)}</div>
        )}
        {isRecording && (
          <div className="mt-1 h-2 w-full rounded bg-gray-200"><div className="h-full rounded bg-green-500" style={{ width: `${Math.min(liveLevel * 100, 100)}%` }} /></div>
        )}
      </div>
    );

    globalDebugRoot.render(Panel);
  }, [DEBUG, isRecording, debugInfo, debugRawWhisper, debugAudioUrl, debugMicLabel, debugTrackSettings, liveLevel, debugEncodedPeak]);

  return (
    <Button
      variant={error ? 'ghost-orange' : 'ghost'}
      size="icon"
      className={cn(
        'relative h-[44px] w-[44px] rounded-xl transition-all duration-200',
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

      {/* Debug panel now rendered via persistent root; nothing to render here */}
    </Button>
  );
}

/**
 * Default export for easier imports
 */
export default VoiceInputRecorder;
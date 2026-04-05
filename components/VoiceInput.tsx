"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: { length: number; [i: number]: { length?: number; [j: number]: { transcript: string }; isFinal?: boolean } };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const getSpeechRecognition = (): SpeechRecognitionCtor | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as Window).SpeechRecognition ?? (window as Window).webkitSpeechRecognition;
};

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Animated sound wave bars component
function SoundWaveBars({ isListening }: { isListening: boolean }) {
  const bars = 5;
  
  return (
    <div className="flex items-center gap-[3px] h-5">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-1 bg-white rounded-full transition-all duration-150 ${
            isListening ? "animate-wave" : "h-1"
          }`}
          style={{
            height: isListening ? undefined : "4px",
            animationDelay: `${i * 100}ms`,
            animationDuration: `${400 + i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

// Concentric pulse rings for recording state
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="absolute w-full h-full rounded-full bg-rose/30 animate-ping" style={{ animationDuration: "2s" }} />
      <span className="absolute w-[140%] h-[140%] rounded-full bg-rose/20 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
      <span className="absolute w-[180%] h-[180%] rounded-full bg-rose/10 animate-ping" style={{ animationDuration: "2s", animationDelay: "1s" }} />
    </div>
  );
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setHasVoice(!!getSpeechRecognition());
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || disabled) return;
    
    const rec = new Ctor();
    recognitionRef.current = rec;
    
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    
    let finalTranscript = "";
    
    rec.onresult = (e: SpeechRecognitionResultEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }
    };
    
    rec.onend = () => {
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
      setIsListening(false);
    };
    
    rec.onerror = () => {
      setIsListening(false);
    };
    
    rec.start();
    setIsListening(true);
  }, [onTranscript, disabled]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return (
    <div className="relative">
      {/* Pulse rings when listening */}
      {isListening && <PulseRings />}
      
      <button
        type="button"
        onClick={hasVoice ? toggleListening : undefined}
        disabled={disabled || !hasVoice}
        className={`
          relative flex items-center justify-center w-12 h-12 rounded-full 
          transition-all duration-300 ease-out
          ${isListening
            ? "bg-rose text-white shadow-lg shadow-rose/30 scale-110"
            : "bg-sage text-white hover:bg-sage-dark hover:scale-105 shadow-lg shadow-sage/20"
          }
          disabled:opacity-40 disabled:pointer-events-none disabled:scale-100
          active:scale-95
        `}
        title={!hasVoice ? "Voice not supported" : isListening ? "Stop listening" : "Tap to talk"}
        aria-label={!hasVoice ? "Voice not supported" : isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? (
          <SoundWaveBars isListening={isListening} />
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>
      
      {/* Status text below button */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className={`text-xs font-medium transition-colors duration-200 ${
          isListening ? "text-rose" : "text-textLight"
        }`}>
          {isListening ? "Listening..." : "Tap to talk"}
        </span>
      </div>
    </div>
  );
}

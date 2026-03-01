"use client";

import { useState, useCallback, useEffect } from "react";

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: { [i: number]: { [j: number]: { transcript: string } }; length: number };
}

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

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

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);

  useEffect(() => {
    setHasVoice(!!getSpeechRecognition());
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || disabled) return;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionResultEvent) => {
      const text = (e.results[e.resultIndex]?.[0]?.transcript ?? "").trim();
      if (text) onTranscript(text);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.start();
    setIsListening(true);
  }, [onTranscript, disabled]);

  const stop = useCallback(() => {
    setIsListening(false);
  }, []);

  return (
    <button
      type="button"
      onClick={hasVoice ? (isListening ? stop : start) : undefined}
      disabled={disabled || !hasVoice}
      className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
        isListening
          ? "bg-red-900/50 text-red-300"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      } disabled:opacity-50 disabled:pointer-events-none`}
      title={!hasVoice ? "Voice not supported" : isListening ? "Stop listening" : "Tap to talk"}
      aria-label={!hasVoice ? "Voice not supported" : isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening ? (
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  );
}

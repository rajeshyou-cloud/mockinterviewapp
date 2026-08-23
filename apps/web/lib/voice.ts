export type TranscriptHandler = (text: string) => void;

export type SpeechInputAdapter = {
  supported: boolean;
  start: (onTranscript: TranscriptHandler, onEnd?: () => void) => void;
  stop: () => void;
};

export type SpeechOutputAdapter = {
  supported: boolean;
  speak: (text: string) => void;
  cancel: () => void;
};

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => RecognitionLike;

export function createBrowserSpeechInput(): SpeechInputAdapter {
  if (typeof window === 'undefined') {
    return { supported: false, start: () => undefined, stop: () => undefined };
  }

  const browserWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

  if (!Recognition) {
    return { supported: false, start: () => undefined, stop: () => undefined };
  }

  let recognition: RecognitionLike | null = null;

  return {
    supported: true,
    start(onTranscript, onEnd) {
      recognition?.stop();
      recognition = new Recognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        const chunks: string[] = [];
        for (let index = 0; index < event.results.length; index += 1) {
          const transcript = event.results[index]?.[0]?.transcript;
          if (transcript) chunks.push(transcript.trim());
        }
        const text = chunks.join(' ').trim();
        if (text) onTranscript(text);
      };
      recognition.onend = () => onEnd?.();
      recognition.start();
    },
    stop() {
      recognition?.stop();
      recognition = null;
    },
  };
}

export function createBrowserSpeechOutput(): SpeechOutputAdapter {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { supported: false, speak: () => undefined, cancel: () => undefined };
  }

  return {
    supported: true,
    speak(text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    cancel() {
      window.speechSynthesis.cancel();
    },
  };
}

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    confidence: float | None = None
    provider: str = "unknown"


@dataclass(frozen=True)
class SpeechResult:
    audio: bytes
    content_type: str
    provider: str = "unknown"


class SpeechToTextProvider(Protocol):
    """Provider boundary for server-side speech transcription."""

    async def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        ...


class TextToSpeechProvider(Protocol):
    """Provider boundary for server-side interviewer speech generation."""

    async def synthesize(self, text: str, voice: str | None = None) -> SpeechResult:
        ...


class MockSpeechToTextProvider:
    """Deterministic development adapter; does not inspect or upload audio."""

    def __init__(self, transcript: str = "Mock transcript from development speech adapter") -> None:
        self.transcript = transcript

    async def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        return TranscriptionResult(
            text=self.transcript,
            confidence=1.0,
            provider="mock-stt",
        )


class MockTextToSpeechProvider:
    """Development adapter that returns UTF-8 bytes instead of synthesized audio."""

    async def synthesize(self, text: str, voice: str | None = None) -> SpeechResult:
        return SpeechResult(
            audio=text.encode("utf-8"),
            content_type="text/plain; charset=utf-8",
            provider="mock-tts",
        )

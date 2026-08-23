import asyncio

from app.providers.voice import MockSpeechToTextProvider, MockTextToSpeechProvider


def test_mock_stt_provider_returns_deterministic_transcript():
    provider = MockSpeechToTextProvider('hello interview')
    result = asyncio.run(provider.transcribe(b'fake-audio', 'audio/webm'))

    assert result.text == 'hello interview'
    assert result.confidence == 1.0
    assert result.provider == 'mock-stt'


def test_mock_tts_provider_returns_development_payload():
    provider = MockTextToSpeechProvider()
    result = asyncio.run(provider.synthesize('next question'))

    assert result.audio == b'next question'
    assert result.content_type.startswith('text/plain')
    assert result.provider == 'mock-tts'

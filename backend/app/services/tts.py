import asyncio
import base64
from typing import Optional

import httpx

from ..core.config import get_settings

settings = get_settings()

# Google Cloud TTS voice names per language code.
# Free tier: 1 million WaveNet characters / month.
# Docs: https://cloud.google.com/text-to-speech/docs/voices
_GOOGLE_VOICE_MAP: dict[str, dict] = {
    "am": {
        "languageCode": "am-ET",
        "name": "am-ET-Standard-A",  # only Standard voice available for Amharic
        "ssmlGender": "FEMALE",
    },
    "en": {
        "languageCode": "en-US",
        "name": "en-US-Wavenet-D",   # warm male WaveNet voice
        "ssmlGender": "MALE",
    },
}

_GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"


class TTSService:
    """
    Text-to-Speech service backed by Google Cloud Text-to-Speech REST API.
    Free tier: 1 million WaveNet characters / month (Standard voices are unlimited free).
    Returns raw MP3 bytes, or None when TTS is disabled / the request fails.
    """

    @property
    def enabled(self) -> bool:
        return bool(settings.google_tts_api_key)

    async def synthesize(
        self,
        text: str,
        language: str = "am",
        voice_override: Optional[str] = None,
    ) -> Optional[bytes]:
        """
        Synthesize `text` to MP3 bytes.
        Returns None if TTS is disabled or the API call fails.
        """
        if not self.enabled:
            return None
        try:
            return await asyncio.to_thread(
                self._request_google, text, language, voice_override
            )
        except Exception:
            return None

    def _request_google(
        self,
        text: str,
        language: str,
        voice_override: Optional[str],
    ) -> bytes:
        voice_cfg = dict(_GOOGLE_VOICE_MAP.get(language, _GOOGLE_VOICE_MAP["en"]))
        if voice_override:
            voice_cfg["name"] = voice_override

        payload = {
            "input": {"text": text},
            "voice": voice_cfg,
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": 1.0,
                "pitch": 0.0,
            },
        }

        with httpx.Client(timeout=30) as client:
            response = client.post(
                _GOOGLE_TTS_URL,
                params={"key": settings.google_tts_api_key},
                json=payload,
            )
            response.raise_for_status()
            audio_b64: str = response.json()["audioContent"]
            return base64.b64decode(audio_b64)


tts_service = TTSService()

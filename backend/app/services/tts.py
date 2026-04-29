import asyncio
from typing import Optional

import httpx

from ..core.config import get_settings

settings = get_settings()

# HuggingFace Inference API model IDs per language.
# facebook/mms-tts-amh — Amharic (Ge'ez script supported via the HF inference endpoint)
# facebook/mms-tts-eng — English
_HF_MODEL_MAP: dict[str, str] = {
    "am": "facebook/mms-tts-amh",
    "en": "facebook/mms-tts-eng",
}

_HF_INFERENCE_URL = "https://api-inference.huggingface.co/models/{model}"


class TTSService:
    """
    Text-to-Speech service backed by HuggingFace Inference API.
    Uses Facebook MMS-TTS models — free with a HuggingFace account token.
    Supports Amharic (am) and English (en) natively.
    Returns WAV bytes, or None when TTS is disabled / the request fails.
    """

    @property
    def enabled(self) -> bool:
        return bool(settings.huggingface_api_token)

    async def synthesize(
        self,
        text: str,
        language: str = "am",
        voice_override: Optional[str] = None,
    ) -> Optional[bytes]:
        """
        Synthesize `text` to WAV audio bytes.
        Returns None if TTS is disabled or the API call fails.
        """
        if not self.enabled:
            return None
        try:
            return await asyncio.to_thread(
                self._request_hf, text, language, voice_override
            )
        except Exception:
            return None

    def _request_hf(
        self,
        text: str,
        language: str,
        voice_override: Optional[str],
    ) -> bytes:
        model = voice_override or _HF_MODEL_MAP.get(language, _HF_MODEL_MAP["en"])
        url = _HF_INFERENCE_URL.format(model=model)

        with httpx.Client(timeout=60) as client:
            response = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.huggingface_api_token}",
                    "Content-Type": "application/json",
                },
                json={"inputs": text},
            )
            response.raise_for_status()
            return response.content


tts_service = TTSService()

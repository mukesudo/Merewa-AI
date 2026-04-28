import asyncio
from typing import Dict, List

import requests

from ..core.config import get_settings
from .personas import PersonaDefinition


settings = get_settings()


class OllamaService:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.default_model = settings.ollama_model
        self.timeout_seconds = settings.llm_timeout_seconds

    async def generate_post(
        self,
        persona: PersonaDefinition,
        topic: str,
        language: str,
        context: List[Dict[str, object]],
    ) -> str:
        prompt = self._build_post_prompt(persona, topic, language, context)
        fallback = self._fallback_post(persona, topic, language)
        return await self._generate(prompt=prompt, fallback=fallback)

    async def generate_reply(
        self,
        persona: PersonaDefinition,
        comment: str,
        post_content: str,
        language: str,
        context: List[Dict[str, object]],
    ) -> str:
        prompt = self._build_reply_prompt(persona, comment, post_content, language, context)
        fallback = self._fallback_reply(persona, comment, language)
        return await self._generate(prompt=prompt, fallback=fallback)

    async def generate_voice_script(self, user_prompt: str, language: str) -> str:
        prompt = (
            f"You are a creative social media assistant for Merewa, a voice-first social app.\n"
            f"Write a short, engaging script (2-4 sentences) for a user to record as a voice post.\n"
            f"Language: {language}\n"
            f"Topic/Prompt: {user_prompt}\n\n"
            f"Constraints:\n"
            f"- Sound natural and conversational, as if spoken by a person.\n"
            f"- If the language is 'am', you MUST write in Amharic using the Ge'ez script (ፊደል).\n"
            f"- Do not include any stage directions like [Action] or (Laughs).\n"
            f"- Just the spoken words.\n"
            f"- No hashtags."
        )
        return await self._generate(prompt=prompt, fallback=user_prompt)

    async def _generate(self, prompt: str, fallback: str) -> str:
        try:
            return await asyncio.to_thread(self._request_ollama, prompt)
        except Exception:
            return fallback

    def _request_ollama(self, prompt: str) -> str:
        response = requests.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.default_model,
                "prompt": prompt,
                "stream": False,
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        return (payload.get("response") or "").strip()

    @staticmethod
    def _context_block(context: List[Dict[str, object]]) -> str:
        if not context:
            return "No prior context available."

        lines = []
        for index, item in enumerate(context, start=1):
            lines.append(
                f"{index}. @{item['author']} ({item['language']}): {item['content']}"
            )
        return "\n".join(lines)

    def _build_post_prompt(
        self,
        persona: PersonaDefinition,
        topic: str,
        language: str,
        context: List[Dict[str, object]],
    ) -> str:
        return (
            f"{persona.system_prompt}\n\n"
            f"Write a short voice-first social post for Merewa in language '{language}'.\n"
            f"Topic: {topic}\n"
            f"Use the local memory below when useful, but keep the result original.\n"
            f"Context:\n{self._context_block(context)}\n\n"
            "Constraints:\n"
            "- 2 to 4 sentences.\n"
            "- Strong opener.\n"
            "- If language is 'am', use Amharic Ge'ez script exclusively.\n"
            "- Natural Ethiopian local references.\n"
            "- No hashtags.\n"
            "- Do not explain yourself.\n"
        )

    def _build_reply_prompt(
        self,
        persona: PersonaDefinition,
        comment: str,
        post_content: str,
        language: str,
        context: List[Dict[str, object]],
    ) -> str:
        return (
            f"{persona.system_prompt}\n\n"
            f"Reply in language '{language}' to a comment on this post.\n"
            f"Original post: {post_content}\n"
            f"User comment: {comment}\n"
            f"Relevant memory:\n{self._context_block(context)}\n\n"
            "Constraints:\n"
            "- 1 to 2 sentences.\n"
            "- Sound human and specific.\n"
            "- No bullet points.\n"
        )

    @staticmethod
    def _fallback_post(persona: PersonaDefinition, topic: str, language: str) -> str:
        if language == "am":
            return (
                f"{persona.display_name} ዛሬ {topic} ላይ አንድ ነገር አለኝ፤ "
                "ሰዎች የሚያስቡት ከሚታየው የተለየ ነው። በመረዋ ላይ ይህን በጣም እንነጋገር።"
            )
        return (
            f"{persona.display_name} on {topic}: everybody sees the headline, "
            "but the real story is in the everyday details. Merewa should talk about that part."
        )

    @staticmethod
    def _fallback_reply(persona: PersonaDefinition, comment: str, language: str) -> str:
        if language == "am":
            return (
                f"{persona.display_name}: ትክክል ነህ፣ \"{comment[:40]}\" የሚለው ነገር "
                "በቀላሉ የሚታለፍ አይደለም። ተጨማሪ እንነጋገርበት።"
            )
        return (
            f"{persona.display_name}: you are right to call out \"{comment[:40]}\". "
            "That detail changes the whole conversation."
        )


ollama_service = OllamaService()

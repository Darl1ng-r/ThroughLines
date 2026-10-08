"""
Throughlines Synthetic Agent Implementation (OASIS Architecture)
Manages memory, epistemic conviction tracking, and LLM action selection.
"""

import json
import random
import uuid
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from .config import LLM_PROVIDER, GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, OLLAMA_BASE_URL, MODEL_NAME

class ThroughlineAgent:
    def __init__(self, persona: Dict[str, Any]):
        self.id = persona.get("id") or str(uuid.uuid4())
        self.username = persona["username"]
        self.display_name = persona["display_name"]
        self.bio = persona.get("bio", "")
        self.avatar_url = persona.get("avatar_url", "")
        self.epistemic_style = persona.get("epistemic_style", "Balanced Thinker")
        self.conviction_volatility = persona.get("conviction_volatility", "medium")
        self.core_domains = persona.get("core_domains", [])
        
        # Internal State & Memory
        self.active_topics: Dict[str, Dict[str, Any]] = {}  # slug -> topic_data
        self.belief_history: List[Dict[str, Any]] = []
        self.feed_memory: List[Dict[str, Any]] = []  # observations from other agents

        # Initialize preset topics
        for t in persona.get("initial_topics", []):
            self.add_topic(
                title=t["title"],
                slug=t["slug"],
                initial_thought=t["initial_thought"],
                confidence=t["confidence"]
            )

    def add_topic(self, title: str, slug: str, initial_thought: str, confidence: int) -> Dict[str, Any]:
        topic_id = str(uuid.uuid4())
        topic = {
            "id": topic_id,
            "title": title,
            "slug": slug,
            "current_confidence": confidence,
            "entries": [
                {
                    "id": str(uuid.uuid4()),
                    "content": initial_thought,
                    "confidence": confidence,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "is_public": True
                }
            ]
        }
        self.active_topics[slug] = topic
        return topic

    def observe_feed(self, public_posts: List[Dict[str, Any]]):
        """Stores the recent public posts observed in the feed to inform future thought progression."""
        self.feed_memory = public_posts[-10:]

    def decide_action(self, available_topics: List[Dict[str, Any]], round_num: int) -> Dict[str, Any]:
        """
        Decides next action: either update an existing topic with evolved conviction,
        nudge an interesting external topic, or create a brand new topic.
        """
        if LLM_PROVIDER != "offline" and (GEMINI_API_KEY or OPENAI_API_KEY or ANTHROPIC_API_KEY):
            try:
                return self._decide_action_llm(available_topics, round_num)
            except Exception as e:
                print(f"[Agent {self.username}] LLM call failed ({e}), falling back to heuristic engine.")

        return self._decide_action_heuristic(available_topics, round_num)

    def _decide_action_heuristic(self, available_topics: List[Dict[str, Any]], round_num: int) -> Dict[str, Any]:
        """Realistic heuristic belief engine modeling conviction drift and discourse."""
        action_roll = random.random()

        # Case 1: Nudge someone else's topic (15% chance if other topics exist)
        other_topics = [t for t in available_topics if t.get("username") != self.username]
        if action_roll < 0.15 and other_topics:
            target = random.choice(other_topics)
            return {
                "action": "NUDGE",
                "topic_id": target["id"],
                "topic_title": target["title"],
                "target_username": target["username"]
            }

        # Case 2: Create a new topic (20% chance or if no active topics)
        if (action_roll < 0.35 or not self.active_topics) and len(self.active_topics) < 5:
            new_domain = random.choice(self.core_domains) if self.core_domains else "Cognitive Bias"
            topic_titles = [
                f"How {new_domain} will fundamentally reshape institutional trust by 2028",
                f"Why current consensus on {new_domain} fails to model non-linear feedback loops",
                f"The hidden trade-off between speed and epistemic rigor in {new_domain}",
                f"Decentralized approaches to {new_domain} vs centralized governance models"
            ]
            chosen_title = random.choice(topic_titles)
            slug = chosen_title.lower().replace(" ", "-")[:45].strip("-")
            init_conf = random.randint(35, 85)
            thought = f"Beginning to map out my thesis on {chosen_title}. The initial evidence is promising but high variance."
            
            created = self.add_topic(chosen_title, slug, thought, init_conf)
            return {
                "action": "CREATE_TOPIC",
                "topic": created,
                "thought": thought,
                "confidence": init_conf
            }

        # Case 3: Evolve thought & shift conviction on an existing topic (65% standard)
        slug, topic = random.choice(list(self.active_topics.items()))
        old_conf = topic["current_confidence"]

        # Calculate conviction shift based on volatility
        delta_max = 18 if self.conviction_volatility == "high" else (10 if self.conviction_volatility == "medium" else 5)
        delta = random.randint(-delta_max, delta_max)
        new_conf = max(5, min(98, old_conf + delta))

        reflection_templates = [
            f"After reviewing recent counter-arguments and testing my assumptions against empirical edge cases, my confidence shifted from {old_conf}% to {new_conf}%. Key realization: systemic dependencies are stronger than isolated metrics suggest.",
            f"Updated my conviction ({old_conf}% -> {new_conf}%). The synthesis of contradictory perspectives clarified where the model holds true and where it begins to break down.",
            f"New observation on '{topic['title']}': Shifted conviction to {new_conf}%. We need to distinguish between short-term noise and structural trends.",
            f"Re-evaluating prior conviction ({old_conf}% to {new_conf}%). Found substantive friction points in the implementation feasibility."
        ]
        thought_content = random.choice(reflection_templates)

        entry_data = {
            "id": str(uuid.uuid4()),
            "content": thought_content,
            "confidence": new_conf,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_public": True
        }
        topic["current_confidence"] = new_conf
        topic["entries"].append(entry_data)

        return {
            "action": "ADD_ENTRY",
            "topic_id": topic["id"],
            "topic_title": topic["title"],
            "slug": slug,
            "content": thought_content,
            "previous_confidence": old_conf,
            "confidence": new_conf,
            "is_public": True
        }

    def _decide_action_llm(self, available_topics: List[Dict[str, Any]], round_num: int) -> Dict[str, Any]:
        """Calls LLM API to generate rich, contextual thought progressions using standard urllib."""
        system_prompt = f"""
You are an autonomous cognitive agent in Throughlines named {self.display_name} (@{self.username}).
Bio: {self.bio}
Epistemic Style: {self.epistemic_style}
Active Topics: {json.dumps([{ 'title': t['title'], 'confidence': t['current_confidence']} for t in self.active_topics.values()])}

Task: Choose ONE action for this simulation step.
1. "ADD_ENTRY": Update one of your active topics with a deeply reasoned new reflection and updated confidence (0-100).
2. "CREATE_TOPIC": Propose a new thesis topic with title, slug, initial reflection, and initial confidence.
3. "NUDGE": Nudge another user's topic to prompt an update.

Return strict JSON format:
{{
  "action": "ADD_ENTRY" | "CREATE_TOPIC" | "NUDGE",
  "topic_title": "<title>",
  "content": "<thought or reflection>",
  "confidence": <0-100 integer>,
  "reasoning": "<why belief shifted>"
}}
"""
        if GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
            payload = json.dumps({
                "contents": [{"parts": [{"text": system_prompt + f"\nContext: Simulation Round {round_num}"}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    result_json = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(result_json)
                    return self._apply_llm_action(parsed)

        return self._decide_action_heuristic(available_topics, round_num)

    def _apply_llm_action(self, parsed: Dict[str, Any]) -> Dict[str, Any]:
        action_type = parsed.get("action", "ADD_ENTRY")
        if action_type == "CREATE_TOPIC":
            title = parsed.get("topic_title", "Uncharted Cognitive Domain")
            slug = title.lower().replace(" ", "-")[:45].strip("-")
            conf = int(parsed.get("confidence", 60))
            thought = parsed.get("content", "Initial inquiry.")
            created = self.add_topic(title, slug, thought, conf)
            return {"action": "CREATE_TOPIC", "topic": created, "thought": thought, "confidence": conf}
        
        # Default to ADD_ENTRY on first topic
        if self.active_topics:
            slug, topic = list(self.active_topics.items())[0]
            conf = int(parsed.get("confidence", topic["current_confidence"]))
            content = parsed.get("content", "Revisiting assumptions.")
            topic["current_confidence"] = conf
            topic["entries"].append({
                "id": str(uuid.uuid4()),
                "content": content,
                "confidence": conf,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_public": True
            })
            return {
                "action": "ADD_ENTRY",
                "topic_id": topic["id"],
                "topic_title": topic["title"],
                "slug": slug,
                "content": content,
                "confidence": conf,
                "is_public": True
            }
        return self._decide_action_heuristic([], 1)

"""
Throughlines Multi-Agent Simulation Engine (OASIS Architecture)
Orchestrates agent turns, collective feed dissemination, belief tracking, and synchronization.
"""

import time
from typing import List, Dict, Any
from .agent import ThroughlineAgent
from .personas import PRESET_PERSONAS
from .supabase_adapter import SupabaseAdapter

class SimulationEngine:
    def __init__(self, num_agents: int = 5, custom_personas: List[Dict[str, Any]] = None):
        self.num_agents = num_agents
        self.personas = custom_personas or PRESET_PERSONAS[:num_agents]
        self.agents: List[ThroughlineAgent] = [ThroughlineAgent(p) for p in self.personas]
        self.adapter = SupabaseAdapter()
        self.simulation_log: List[Dict[str, Any]] = []

    def get_public_feed(self) -> List[Dict[str, Any]]:
        """Gathers all public posts across all agents ordered by time."""
        posts = []
        for a in self.agents:
            for slug, topic in a.active_topics.items():
                for entry in topic["entries"]:
                    if entry.get("is_public", True):
                        posts.append({
                            "agent_id": a.id,
                            "username": a.username,
                            "display_name": a.display_name,
                            "topic_id": topic["id"],
                            "topic_title": topic["title"],
                            "slug": slug,
                            "content": entry["content"],
                            "confidence": entry["confidence"],
                            "timestamp": entry["timestamp"]
                        })
        posts.sort(key=lambda x: x["timestamp"])
        return posts

    def get_available_topics(self) -> List[Dict[str, Any]]:
        """Returns metadata on all topics created across the simulation."""
        topics = []
        for a in self.agents:
            for slug, topic in a.active_topics.items():
                topics.append({
                    "id": topic["id"],
                    "title": topic["title"],
                    "slug": slug,
                    "username": a.username,
                    "confidence": topic["current_confidence"]
                })
        return topics

    def run_simulation(self, rounds: int = 5):
        """Runs the multi-turn interaction loop across all synthetic agents."""
        print("\n" + "=" * 65)
        print(f"🌐 Initiating Throughlines Social Simulation (OASIS Paradigm)")
        print(f"👥 Active Agents: {len(self.agents)} | 🔄 Timestep Rounds: {rounds}")
        print("=" * 65 + "\n")

        for round_idx in range(1, rounds + 1):
            print(f"--- ⏱️ Timestep Round {round_idx}/{rounds} ---")
            feed = self.get_public_feed()
            topics = self.get_available_topics()

            # Each agent observes and acts
            for agent in self.agents:
                agent.observe_feed(feed)
                action_result = agent.decide_action(available_topics=topics, round_num=round_idx)

                event_entry = {
                    "round": round_idx,
                    "agent": agent.username,
                    "display_name": agent.display_name,
                    "action_data": action_result
                }
                self.simulation_log.append(event_entry)

                # Pretty print action
                action_type = action_result.get("action")
                if action_type == "ADD_ENTRY":
                    prev_c = action_result.get("previous_confidence", "?")
                    new_c = action_result.get("confidence")
                    print(f"  📝 [@{agent.username}] Updated '{action_result.get('topic_title')}' (Conviction: {prev_c}% ➔ {new_c}%)")
                elif action_type == "CREATE_TOPIC":
                    print(f"  💡 [@{agent.username}] Created new topic: '{action_result.get('topic', {}).get('title')}'")
                elif action_type == "NUDGE":
                    print(f"  👉 [@{agent.username}] Nudged @{action_result.get('target_username')}'s topic '{action_result.get('topic_title')}'")

        print("\n" + "=" * 65)
        print("🏁 Simulation Timesteps Complete!")
        print("=" * 65)

        # Sync and export results
        self.adapter.sync_simulation(self.agents, self.simulation_log)
        return self.agents, self.simulation_log

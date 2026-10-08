"""
Throughlines Supabase Sync & SQL Seed Exporter
Provides both live REST synchronization and zero-dependency SQL/JSON export.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from .config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_OUTPUT_DIR

class SupabaseAdapter:
    def __init__(self):
        self.client = None
        self.enabled = bool(SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY))
        
        if self.enabled:
            try:
                from supabase import create_client
                key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
                self.client = create_client(SUPABASE_URL, key)
                print(f"✅ Supabase client initialized for: {SUPABASE_URL}")
            except Exception as e:
                print(f"⚠️ Could not initialize live Supabase client: {e}. Running in SQL/JSON export mode.")
                self.enabled = False

    def sync_simulation(self, agents: List[Any], simulation_log: List[Dict[str, Any]]):
        """Syncs all simulated profiles, topics, entries and posts to Supabase and exports SQL/JSON."""
        # 1. Export SQL Seed Script
        sql_file = DEFAULT_OUTPUT_DIR / "throughlines_simulation_seed.sql"
        self._export_sql(agents, simulation_log, sql_file)
        
        # 2. Export JSON snapshot
        json_file = DEFAULT_OUTPUT_DIR / "throughlines_simulation.json"
        self._export_json(agents, simulation_log, json_file)

        print(f"\n📁 Simulation artifacts generated:")
        print(f"   📜 SQL Seed:  {sql_file}")
        print(f"   📊 JSON Data: {json_file}")

        # 3. Live Supabase Push (if service role is available)
        if self.enabled and SUPABASE_SERVICE_ROLE_KEY:
            print("🚀 Pushing simulation data to live Supabase instance...")
            self._live_push(agents)

    def _export_sql(self, agents: List[Any], simulation_log: List[Dict[str, Any]], target_path: Path):
        """Generates idempotent PostgreSQL insert statements compatible with Supabase auth.users & RLS."""
        lines = [
            "-- Throughlines Synthetic Community Seed Script",
            f"-- Generated on: {datetime.now(timezone.utc).isoformat()}",
            "-- Compatible with Throughlines Supabase Auth & Public Schema\n",
            "BEGIN;\n",
            "-- 1. Insert into auth.users so foreign key references in public.profiles succeed"
        ]

        for a in agents:
            clean_name = a.display_name.replace("'", "''")
            email = f"{a.username}@throughlines.internal"
            lines.append(
                f"INSERT INTO auth.users ("
                f"  instance_id, id, aud, role, email, encrypted_password, "
                f"  email_confirmed_at, recovery_sent_at, last_sign_in_at, "
                f"  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, "
                f"  confirmation_token, email_change, email_change_token_new, recovery_token"
                f") VALUES ("
                f"  '00000000-0000-0000-0000-000000000000', '{a.id}', 'authenticated', 'authenticated', "
                f"  '{email}', '', NOW(), NOW(), NOW(), "
                f"  '{{\"provider\":\"email\",\"providers\":[\"email\"]}}', "
                f"  '{{\"username\":\"{a.username}\",\"full_name\":\"{clean_name}\"}}', "
                f"  NOW(), NOW(), '', '', '', ''"
                f") ON CONFLICT (id) DO NOTHING;"
            )

        # 2. Profiles
        lines.append("\n-- 2. Insert into public.profiles")
        for a in agents:
            clean_bio = a.bio.replace("'", "''")
            clean_name = a.display_name.replace("'", "''")
            avatar = getattr(a, 'avatar_url', '')
            lines.append(
                f"INSERT INTO public.profiles (id, username, display_name, bio, avatar_url) "
                f"VALUES ('{a.id}', '{a.username}', '{clean_name}', '{clean_bio}', '{avatar}') "
                f"ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio, username = EXCLUDED.username, avatar_url = EXCLUDED.avatar_url;"
            )

        # 3. Topics & Entries
        lines.append("\n-- 3. Insert Topics & Public Posts")
        for a in agents:
            for slug, topic in a.active_topics.items():
                clean_title = topic['title'].replace("'", "''")
                lines.append(
                    f"INSERT INTO public.topics (id, user_id, title, slug) "
                    f"VALUES ('{topic['id']}', '{a.id}', '{clean_title}', '{slug}') "
                    f"ON CONFLICT (user_id, slug) DO NOTHING;"
                )

                for entry in topic['entries']:
                    clean_content = entry['content'].replace("'", "''")
                    entry_id = entry['id']
                    conf = entry['confidence']
                    ts = entry.get('timestamp', datetime.now(timezone.utc).isoformat())

                    # Insert private entry
                    lines.append(
                        f"INSERT INTO public.private_entries (id, topic_id, user_id, content, confidence_rating, entry_date) "
                        f"VALUES ('{entry_id}', '{topic['id']}', '{a.id}', '{clean_content}', {conf}, '{ts}') "
                        f"ON CONFLICT (id) DO NOTHING;"
                    )

                    # Insert corresponding public post
                    if entry.get("is_public", True):
                        lines.append(
                            f"INSERT INTO public.public_posts (private_entry_id, topic_id, user_id, content, confidence_rating, moderation_status, entry_date) "
                            f"VALUES ('{entry_id}', '{topic['id']}', '{a.id}', '{clean_content}', {conf}, 'approved', '{ts}') "
                            f"ON CONFLICT (id) DO NOTHING;"
                        )

        # 4. Insert Nudges
        agent_id_by_username = {a.username: a.id for a in agents}
        nudge_events = [
            e for e in simulation_log 
            if (e.get("action_data", {}).get("action") == "NUDGE") or (e.get("action") == "NUDGE")
        ]
        if nudge_events:
            lines.append("\n-- 4. Insert Nudges")
            for event in nudge_events:
                action_data = event.get("action_data") if event.get("action_data") else event
                t_id = action_data.get("topic_id")
                nudger_username = event.get("agent")
                nudger_id = agent_id_by_username.get(nudger_username) or event.get("agent_id")
                if t_id and nudger_id:
                    lines.append(
                        f"INSERT INTO public.nudges (topic_id, nudger_id) "
                        f"VALUES ('{t_id}', '{nudger_id}') "
                        f"ON CONFLICT (topic_id, nudger_id) DO NOTHING;"
                    )

        lines.append("\nCOMMIT;\n")
        with open(target_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

    def _export_json(self, agents: List[Any], simulation_log: List[Dict[str, Any]], target_path: Path):
        data = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "agent_count": len(agents),
                "event_count": len(simulation_log)
            },
            "agents": [
                {
                    "id": a.id,
                    "username": a.username,
                    "display_name": a.display_name,
                    "bio": a.bio,
                    "avatar_url": getattr(a, 'avatar_url', ''),
                    "epistemic_style": a.epistemic_style,
                    "topics": list(a.active_topics.values())
                }
                for a in agents
            ],
            "timeline": simulation_log
        }
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def _live_push(self, agents: List[Any]):
        """Uploads directly via Supabase API."""
        try:
            for a in agents:
                self.client.table("profiles").upsert({
                    "id": a.id,
                    "username": a.username,
                    "display_name": a.display_name,
                    "bio": a.bio,
                    "avatar_url": getattr(a, 'avatar_url', '')
                }).execute()

                for slug, topic in a.active_topics.items():
                    self.client.table("topics").upsert({
                        "id": topic["id"],
                        "user_id": a.id,
                        "title": topic["title"],
                        "slug": slug
                    }).execute()

                    for entry in topic["entries"]:
                        self.client.table("private_entries").upsert({
                            "id": entry["id"],
                            "topic_id": topic["id"],
                            "user_id": a.id,
                            "content": entry["content"],
                            "confidence_rating": entry["confidence"]
                        }).execute()

                        if entry.get("is_public", True):
                            self.client.table("public_posts").upsert({
                                "private_entry_id": entry["id"],
                                "topic_id": topic["id"],
                                "user_id": a.id,
                                "content": entry["content"],
                                "confidence_rating": entry["confidence"],
                                "moderation_status": "approved"
                            }).execute()
            print("✨ Successfully pushed simulation data to Supabase!")
        except Exception as e:
            print(f"❌ Error during live push to Supabase: {e}")

import os
import re
from pathlib import Path

def _load_env_fallback(file_path: Path):
    """Fallback .env parser using standard library."""
    if not file_path.exists():
        return
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if key not in os.environ:
                os.environ[key] = val

# Try importing python-dotenv; fall back to standard parser if not available
try:
    from dotenv import load_dotenv
    has_dotenv = True
except ImportError:
    has_dotenv = False

env_paths = [
    Path.cwd() / ".env",
    Path(__file__).parent / ".env",
    Path(__file__).parent.parent / ".env"
]

for p in env_paths:
    if p.exists():
        if has_dotenv:
            load_dotenv(dotenv_path=p, override=False)
        else:
            _load_env_fallback(p)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# LLM Configurations
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "offline").lower()  # 'offline', 'gemini', 'openai', 'anthropic', 'ollama'
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.0-flash" if LLM_PROVIDER == "gemini" else "gpt-4o-mini")

# Simulation defaults
DEFAULT_NUM_AGENTS = int(os.getenv("SIM_AGENTS", "5"))
DEFAULT_NUM_ROUNDS = int(os.getenv("SIM_ROUNDS", "4"))
DEFAULT_OUTPUT_DIR = Path(__file__).parent / "output"
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

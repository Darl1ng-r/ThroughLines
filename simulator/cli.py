"""
Throughlines Simulation CLI
Command line interface to launch synthetic user simulations on Throughlines.
"""

import argparse
import sys
from pathlib import Path

# Add project root to python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from simulator.engine import SimulationEngine
from simulator.config import DEFAULT_NUM_AGENTS, DEFAULT_NUM_ROUNDS, LLM_PROVIDER

def main():
    parser = argparse.ArgumentParser(
        description="Throughlines Agent Simulation (OASIS Architecture)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "--agents", "-a",
        type=int,
        default=DEFAULT_NUM_AGENTS,
        help="Number of simulated agents (up to number of configured personas)"
    )
    parser.add_argument(
        "--rounds", "-r",
        type=int,
        default=DEFAULT_NUM_ROUNDS,
        help="Number of simulation timesteps/rounds to execute"
    )
    parser.add_argument(
        "--provider", "-p",
        type=str,
        default=LLM_PROVIDER,
        choices=["offline", "gemini", "openai", "anthropic", "ollama"],
        help="LLM intelligence provider for agent reasoning"
    )

    args = parser.parse_args()

    print(f"🚀 Initializing Throughlines Simulation with Provider: [{args.provider}]")
    engine = SimulationEngine(num_agents=args.agents)
    engine.run_simulation(rounds=args.rounds)

if __name__ == "__main__":
    main()

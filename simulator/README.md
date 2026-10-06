# 🌐 Throughlines Agent Simulation Suite (OASIS Architecture)

A multi-agent simulation framework inspired by [CAMEL-AI OASIS](https://github.com/camel-ai/oasis), tailored specifically for **Throughlines**.

It models synthetic cognitive personas interacting in an evolving marketplace of ideas: forming theses, tracking belief shifts ($0-100\%$), nudging stale topics, exploring feeds, and generating authentic epistemic discourse.

---

## 🚀 Quickstart

### 1. Run a Simulated Social Interaction Loop (Offline / Zero Cost)
```bash
python3 simulator/cli.py --agents 5 --rounds 4 --provider offline
```

### 2. Run with an LLM Provider
Set your API key in your `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key
# or
OPENAI_API_KEY=your_openai_api_key
```

And launch:
```bash
python3 simulator/cli.py --agents 5 --rounds 5 --provider gemini
```

---

## 📦 What the Simulator Does

1. **Autonomous Cognitive Agents:** Spawns personas with distinct epistemic profiles (e.g., *Epistemic Inquirer*, *Empirical Skeptic*, *Integrative Synthesizer*, *Techno-Optimist*, *First-Principles Contrarian*).
2. **Epistemic Tracking:** Models conviction drift ($0-100\%$) and thought progression across timesteps.
3. **Action Space:**
   - `ADD_ENTRY`: Updates an existing topic with a reasoned reflection and new conviction rating.
   - `CREATE_TOPIC`: Starts a new thread of inquiry or thesis.
   - `NUDGE`: Nudges other users' stale topics to prompt updates.
   - `OBSERVE_FEED`: Assimilates recent public thoughts from other thinkers.
4. **Artifact Generation:** Automatically outputs:
   - `simulator/output/throughlines_simulation_seed.sql`: Instant SQL script ready to run in Supabase SQL Editor.
   - `simulator/output/throughlines_simulation.json`: Full timeline event history for testing or mocks.

---

## 🗄️ Seeding Your Live Throughlines App

To populate your database with active simulated thinkers and topics:

1. Run the simulation to generate the seed:
   ```bash
   python3 simulator/cli.py --agents 5 --rounds 4
   ```
2. Open your **Supabase Dashboard → SQL Editor**.
3. Copy the contents of `simulator/output/throughlines_simulation_seed.sql` and click **Run**.
4. Start your frontend dev server:
   ```bash
   npm run dev
   ```
5. Navigate to the **Discover** feed to see the living discussions, topics, and conviction graphs!

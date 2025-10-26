# What's Next - Backend

AI-powered game master agent built with Google ADK.

## Overview

This backend provides an AI agent that acts as a game master, creating interactive stories for players. The agent uses Google's Gemini 2.5 Flash model to generate dynamic narratives.

## Setup

1. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
Create a `.env` file in the `whats_next_agent` directory with your Google API credentials.

## Project Structure

```
backend/
 whats_next_agent/
    agent.py       # Main agent definition
    prompts.py     # Agent prompts and instructions
    __init__.py
 config.py          # Configuration settings
 requirements.txt   # Python dependencies
```

## Usage

The main agent is defined in `whats_next_agent/agent.py` and can be imported and used in your application.

## Dependencies

- google-adk: Google Agent Development Kit for building AI agents

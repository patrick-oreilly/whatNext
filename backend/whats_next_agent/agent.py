from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent
from google.adk.models import google_llm
from .prompts import BASE_PROMPT,HOOP_DREAMS_PROMPT
from dotenv import load_dotenv
import os

MODEL="gemini-2.0-flash-live-001"

load_dotenv()

# Game master agent

root_agent = LlmAgent(
    model=MODEL,
    name='root_agent',
    description='A game master that can create a story for a group of players.',
    instruction=BASE_PROMPT,
)

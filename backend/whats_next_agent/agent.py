from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent
from .prompts import BASE_PROMPT,HOOP_DREAMS_PROMPT

# Game master agent
root_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='A game master that can create a story for a group of players.',
    instruction=BASE_PROMPT + HOOP_DREAMS_PROMPT,
)

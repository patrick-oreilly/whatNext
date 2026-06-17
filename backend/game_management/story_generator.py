import logging
import re
from typing import List
from backend.core.models import StoryLineType, StorySegment
from backend.agent import prompts

logger = logging.getLogger(__name__)

class StoryGenerator:
    """Handles prompt generation for AI story creation"""
    
    def __init__(self):
        logger.info("StoryGenerator initialized")
    
    def get_storyline_prompt(self, storyline: StoryLineType) -> str:
        """
        Get the base prompt for a storyline

        Args:
            storyline: Type of story to generate

        Returns:
            Base prompt text for the storyline
        """
        if storyline == StoryLineType.HOOP_DREAMS:
            return prompts.HOOP_DREAMS_PROMPT
        elif storyline == StoryLineType.SPACE_EXPLORATION:
            return prompts.SPACE_EXPLORATION
        elif storyline == StoryLineType.HAUNTED_MANSION:
            return prompts.HAUNTED_MANSION
        elif storyline == StoryLineType.CASINO_HEIST:
            return prompts.CASINO_HEIST
        elif storyline == StoryLineType.SUNFLOWER_WEST:
            return prompts.SUNFLOWER_PLOTLINE
        elif storyline == StoryLineType.CUSTOM_STORYLINE:
            return ""
        else:
            return prompts.BASE_PROMPT

    def generate_opening_prompt(self, storyline: StoryLineType) -> str:
        """
        Generate prompt for opening story segment
        
        This is sent as the first message to ADK to start the story.
        
        Args:
            storyline: Type of story
            
        Returns:
            Prompt text for AI
        """
        base_prompt = self.get_storyline_prompt(storyline)
        
        # For opening, we just send the base storyline prompt
        # ADK will use it to generate the opening scene
        logger.info(f"Generated opening prompt for {storyline}")
        return base_prompt
    
    def _build_history_context(self, story_history: List[StorySegment]) -> str:
        if not story_history:
            return ""
        recent = story_history[-5:]
        context = "\n\nRecent story events (for context):\n"
        for seg in recent:
            context += f"- {seg.content.paragraph}\n"
        return context

    def generate_continuation_prompt(
        self,
        storyline: StoryLineType,
        story_history: List[StorySegment],
        winning_input: str,
        turn: int,
        max_turns: int
    ) -> str:
        """
        Generate prompt for story continuation based on winning player input

        Args:
            storyline: Type of story
            story_history: Previous story segments (for reference)
            winning_input: Player's winning continuation idea
            turn: Current turn number
            max_turns: Maximum turns before ending

        Returns:
            Prompt text for AI
        """
        formatted_input = self.format_player_input(winning_input)

        turn_info = f"\n\n[Turn {turn} of {max_turns}]"

        is_near_end = turn >= (max_turns - 2)

        if is_near_end:
            ending_instruction = (
                "\n\nIMPORTANT: The story is nearing its conclusion. "
                "Begin wrapping up plot threads and moving toward a satisfying ending."
            )
        else:
            ending_instruction = ""

        history_context = self._build_history_context(story_history)
        prompt = f"{history_context}{formatted_input}{turn_info}{ending_instruction}"

        logger.info(f"Generated continuation prompt for turn {turn}/{max_turns}")
        return prompt

    def generate_natural_continuation_prompt(
        self,
        storyline: StoryLineType,
        story_history: List[StorySegment],
        turn: int,
        max_turns: int
    ) -> str:
        """
        Generate prompt for natural story continuation when no player input was submitted

        Args:
            storyline: Type of story
            story_history: Previous story segments (for reference)
            turn: Current turn number
            max_turns: Maximum turns before ending

        Returns:
            Prompt text for AI to continue naturally
        """
        # Add explicit turn information for better pacing
        turn_info = f"[Turn {turn} of {max_turns}]"

        # Check if we should start wrapping up
        is_near_end = turn >= (max_turns - 2)

        if is_near_end:
            ending_instruction = (
                "\n\nIMPORTANT: The story is nearing its conclusion. "
                "Begin wrapping up plot threads and moving toward a satisfying ending."
            )
        else:
            ending_instruction = ""

        natural_instruction = (
            "Continue the story naturally, advancing the plot in a logical and engaging way. "
            "Build on the previous events and maintain the established tone and pacing."
        )

        history_context = self._build_history_context(story_history)
        prompt = f"{history_context}{natural_instruction}\n\n{turn_info}{ending_instruction}"

        logger.info(f"Generated natural continuation prompt for turn {turn}/{max_turns}")
        return prompt
    
    def generate_final_prompt(
        self,
        storyline: StoryLineType,
        story_history: List[StorySegment],
        winning_input: str
    ) -> str:
        """
        Generate prompt for final story segment
        
        Args:
            storyline: Type of story
            story_history: All previous story segments
            winning_input: Final player input
            
        Returns:
            Prompt text for AI with ending instruction
        """
        formatted_input = self.format_player_input(winning_input)
        
        ending_instruction = (
            "\n\nFINAL TURN: This is the last turn. Bring the story to a "
            "dramatic and satisfying conclusion that wraps up all major plot threads. "
            "Make it memorable and impactful."
        )
        
        history_context = self._build_history_context(story_history)
        prompt = f"{history_context}{formatted_input}{ending_instruction}"
        
        logger.info("Generated final story prompt")
        return prompt
    
    def format_player_input(self, input_text: str) -> str:
        """
        Format player input for AI consumption
        
        Args:
            input_text: Raw player input
            
        Returns:
            Formatted input ready for AI
        """
        cleaned = input_text.strip()
        cleaned = cleaned.replace('{', '').replace('}', '')
        cleaned = re.sub(
            r'<\s*/\s*player[\s_\-]*input\s*>',
            '[player_input_close]',
            cleaned,
            flags=re.IGNORECASE
        )
        formatted = f'<player_input>\n{cleaned}\n</player_input>'
        return formatted
    
    def should_end_story(self, turn: int, max_turns: int) -> bool:
        """
        Determine if story should end after this turn
        
        Args:
            turn: Current turn number
            max_turns: Maximum allowed turns
            
        Returns:
            True if story should end
        """
        return turn >= max_turns
from google import genai
import os


client = genai.Client(api_key="")

# Pricing data (as of October 2025)
# Prices are per million tokens
PRICING = {
    # Gemini 2.5 Models
    'gemini-2.5-pro': {'input': 1.25, 'output': 10.00, 'note': 'Up to 200K tokens'},
    'gemini-2.5-flash': {'input': 0.15, 'output': 0.60, 'note': ''},
    'gemini-2.5-flash-lite': {'input': 0.02, 'output': 0.08, 'note': 'Cheapest option'},

    # Gemini 2.0 Models
    'gemini-2.0-pro-exp': {'input': 0.00, 'output': 0.00, 'note': 'Free (experimental)'},
    'gemini-2.0-flash': {'input': 0.15, 'output': 0.60, 'note': ''},
    'gemini-2.0-flash-exp': {'input': 0.00, 'output': 0.00, 'note': 'Free (experimental)'},

    # Gemini 1.5 Models
    'gemini-1.5-pro': {'input': 1.25, 'output': 5.00, 'note': ''},
    'gemini-1.5-flash': {'input': 0.15, 'output': 0.60, 'note': '1500 req/day free'},

    # Default pricing for unlisted models
    'default': {'input': None, 'output': None, 'note': 'Pricing not available'}
}

def get_pricing(model_name):
    """Get pricing info for a model by matching name patterns."""
    name = model_name.lower()

    # Check exact matches and patterns
    for key, pricing in PRICING.items():
        if key in name:
            return pricing

    # Check if it's experimental (usually free)
    if 'exp' in name or 'preview' in name:
        return {'input': 0.00, 'output': 0.00, 'note': 'Free (experimental/preview)'}

    return PRICING['default']

# List all available models
models = client.models.list()

print("Models supporting generateContent with Pricing:\n")
generate_content_models = []

for model in models:
    if hasattr(model, 'supported_actions') and 'generateContent' in model.supported_actions:
        pricing = get_pricing(model.name)
        generate_content_models.append({
            'name': model.name,
            'actions': model.supported_actions,
            'pricing': pricing,
            'input_limit': model.input_token_limit,
            'output_limit': model.output_token_limit
        })

# Group by model family
gemini_25 = [m for m in generate_content_models if 'gemini-2.5' in m['name']]
gemini_20 = [m for m in generate_content_models if 'gemini-2.0' in m['name']]
gemma = [m for m in generate_content_models if 'gemma' in m['name']]
other = [m for m in generate_content_models if m not in gemini_25 + gemini_20 + gemma]

def print_model_info(m):
    """Print formatted model information with pricing."""
    name = m['name'].replace('models/', '')
    pricing = m['pricing']

    # Format pricing
    if pricing['input'] is None:
        price_str = "Pricing N/A"
    elif pricing['input'] == 0.00:
        price_str = "FREE"
    else:
        price_str = f"${pricing['input']}/M in | ${pricing['output']}/M out"

    # Add note if available
    if pricing['note']:
        price_str += f" ({pricing['note']})"

    # Format token limits
    input_limit = f"{m['input_limit']:,}" if m['input_limit'] else "N/A"
    output_limit = f"{m['output_limit']:,}" if m['output_limit'] else "N/A"

    print(f"  • {name}")
    print(f"    Cost: {price_str}")
    print(f"    Limits: {input_limit} in | {output_limit} out tokens")

print("=== Gemini 2.5 Models ===")
for m in gemini_25:
    print_model_info(m)
    print()

print("=== Gemini 2.0 Models ===")
for m in gemini_20:
    print_model_info(m)
    print()

print("=== Gemma Models ===")
for m in gemma:
    print_model_info(m)
    print()

if other:
    print("=== Other Models ===")
    for m in other:
        print_model_info(m)
        print()

print(f"Total: {len(generate_content_models)} models support generateContent")
print("\nNote: Prices are per million tokens. Preview/experimental models are typically free.")
"""
Garden Advisor - Claude-powered RAG chatbot
============================================
Uses species database as context for personalized advice.
"""

import anthropic
import os
from typing import Dict, List, Optional
from species_db import (
    PLANTS, POLLINATORS,
    search_plants, search_pollinators,
    get_september_critical_plants, get_milkweeds,
    get_planting_recommendations,
    BloomSeason, SunRequirement, WaterNeed
)

# Get API key from environment
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')


def _build_species_context(query: str) -> str:
    """Build relevant context from species database based on query."""
    
    context_parts = []
    query_lower = query.lower()
    
    # Always include September critical plants if relevant keywords
    if any(word in query_lower for word in ['september', 'fall', 'autumn', 'migrate', 'monarch', 'late season']):
        sept_plants = get_september_critical_plants()
        context_parts.append("## September Critical Plants (for monarch migration)")
        for p in sept_plants:
            context_parts.append(f"- **{p.common_name}** ({p.scientific_name}): {p.description} Planting tips: {p.planting_tips}")
    
    # Include milkweeds if monarch/caterpillar/host mentioned
    if any(word in query_lower for word in ['milkweed', 'monarch', 'caterpillar', 'host', 'larvae', 'eggs']):
        milkweeds = get_milkweeds()
        context_parts.append("\n## Milkweeds (Monarch Host Plants)")
        for p in milkweeds:
            context_parts.append(f"- **{p.common_name}** ({p.scientific_name}): {p.description} Water needs: {p.water.value}. Tips: {p.planting_tips}")
    
    # Search for specific plants mentioned
    plant_results = search_plants(query=query)
    if plant_results and len(plant_results) <= 5:
        context_parts.append("\n## Matching Plants")
        for p in plant_results:
            context_parts.append(
                f"- **{p.common_name}** ({p.scientific_name}): Monarch value {p.monarch_value}/10, "
                f"Blooms: {', '.join(s.value for s in p.bloom_seasons)}, "
                f"Sun: {p.sun.value}, Water: {p.water.value}. {p.description}"
            )
    
    # Search for pollinators mentioned
    pollinator_results = search_pollinators(query=query)
    if pollinator_results:
        context_parts.append("\n## Matching Pollinators")
        for p in pollinator_results:
            context_parts.append(
                f"- **{p.common_name}** ({p.scientific_name}): {p.category}. "
                f"Active months: {p.active_months}. {p.description} "
                f"ID tips: {p.identification_tips}"
            )
    
    # If asking about conditions, include relevant recommendations
    if any(word in query_lower for word in ['shade', 'sun', 'water', 'dry', 'drought', 'wet']):
        # Determine conditions from query
        sun = SunRequirement.PARTIAL_SHADE if 'shade' in query_lower else SunRequirement.FULL_SUN
        water = WaterNeed.HIGH if 'wet' in query_lower else (WaterNeed.LOW if any(w in query_lower for w in ['dry', 'drought']) else WaterNeed.MODERATE)
        
        recs = get_planting_recommendations(sun=sun, water=water, has_september_gap=True)
        context_parts.append(f"\n## Recommendations for {sun.value}, {water.value} water")
        for r in recs.get('critical', [])[:4]:
            context_parts.append(f"- CRITICAL: {r['plant']} - {r['reason']}")
        for r in recs.get('recommended', [])[:3]:
            context_parts.append(f"- Recommended: {r['plant']} - {r['reason']}")
    
    # If no specific context, include general overview
    if not context_parts:
        context_parts.append("## Utah Pollinator Garden Overview")
        context_parts.append(f"Database contains {len(PLANTS)} native/adapted plants and {len(POLLINATORS)} pollinator species.")
        context_parts.append("\nTop monarch-value plants:")
        top_plants = sorted(PLANTS.values(), key=lambda p: p.monarch_value, reverse=True)[:5]
        for p in top_plants:
            context_parts.append(f"- {p.common_name}: Monarch value {p.monarch_value}/10")
    
    return "\n".join(context_parts)


def _build_system_prompt() -> str:
    """Build the system prompt for the garden advisor."""
    return """You are the Utah Pollinator Path Garden Advisor, an expert on creating pollinator-friendly gardens along Utah's Wasatch Front to support monarch butterfly migration.

Your expertise includes:
- Utah native plants and their bloom times
- Monarch butterfly migration patterns (they pass through Utah in September heading to Mexico)
- The critical "September gap" - many gardens lack late-season nectar sources
- Host plants (milkweeds) vs nectar plants
- Utah's climate, water restrictions, and xeriscaping

Key facts to remember:
- Monarchs NEED milkweed to lay eggs - it's the ONLY host plant for caterpillars
- September is CRITICAL - monarchs migrating through need nectar sources
- Rabbitbrush is THE most important September plant in Utah
- Utah gardens should be drought-tolerant (low water)
- Most Utah yards get full sun

Your personality:
- Enthusiastic about pollinators
- Practical and specific with advice
- Encouraging to beginners
- Always mention September/fall plants when relevant
- Suggest 2-4 specific plants rather than long lists

When you don't have specific information in the provided context, say so and give general guidance."""


async def ask_garden_advisor(
    question: str,
    user_context: Optional[Dict] = None,
) -> Dict:
    """
    Ask the garden advisor a question.
    
    Args:
        question: User's question
        user_context: Optional dict with user info (location, existing plants, etc.)
    
    Returns:
        Response dict with answer and sources
    """
    
    if not ANTHROPIC_API_KEY:
        return {
            "success": False,
            "error": "ANTHROPIC_API_KEY not configured",
        }
    
    # Build context from species database
    species_context = _build_species_context(question)
    
    # Build user context if provided
    user_info = ""
    if user_context:
        user_info = "\n\nUser's garden info:\n"
        if user_context.get('city'):
            user_info += f"- Location: {user_context['city']}, Utah\n"
        if user_context.get('sun'):
            user_info += f"- Sun conditions: {user_context['sun']}\n"
        if user_context.get('water'):
            user_info += f"- Water availability: {user_context['water']}\n"
        if user_context.get('existing_plants'):
            user_info += f"- Already growing: {', '.join(user_context['existing_plants'])}\n"
        if user_context.get('september_score') is not None:
            score = user_context['september_score']
            if score < 0.3:
                user_info += "- September nectar gap: SEVERE - needs late-season plants urgently\n"
            elif score < 0.6:
                user_info += "- September nectar gap: MODERATE - could use more fall bloomers\n"
            else:
                user_info += "- September coverage: GOOD\n"
    
    # Combine into context
    full_context = f"""# Utah Pollinator Species Database

{species_context}
{user_info}"""
    
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=_build_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": f"""Based on this Utah pollinator database:

{full_context}

Question: {question}

Please provide helpful, specific advice for a Utah gardener."""
                }
            ]
        )
        
        response_text = message.content[0].text
        
        return {
            "success": True,
            "answer": response_text,
            "context_used": species_context[:500] + "..." if len(species_context) > 500 else species_context,
            "model": "claude-sonnet-4-20250514",
        }
        
    except anthropic.APIError as e:
        return {
            "success": False,
            "error": f"API error: {str(e)}",
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


# Synchronous wrapper for Flask
def ask_advisor_sync(question: str, user_context: Optional[Dict] = None) -> Dict:
    """Synchronous version for Flask."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(ask_garden_advisor(question, user_context))
    finally:
        loop.close()


# Test
if __name__ == "__main__":
    import sys
    
    # Check for API key
    if not ANTHROPIC_API_KEY:
        print("⚠️  ANTHROPIC_API_KEY not set")
        print("   Export it: export ANTHROPIC_API_KEY=your-key-here")
        print("\n   Testing context building only...\n")
        
        test_queries = [
            "What should I plant for monarchs?",
            "I have a shady yard, what works?",
            "How do I identify a painted lady butterfly?",
        ]
        
        for q in test_queries:
            print(f"Query: {q}")
            context = _build_species_context(q)
            print(f"Context preview: {context[:300]}...\n")
        
        sys.exit(0)
    
    # With API key, do full test
    print("Testing Garden Advisor...\n")
    
    result = ask_advisor_sync(
        "What are the best plants for September monarch migration?",
        user_context={"city": "Murray", "sun": "full_sun", "water": "low"}
    )
    
    if result['success']:
        print("✅ Response:")
        print(result['answer'])
    else:
        print(f"❌ Error: {result['error']}")

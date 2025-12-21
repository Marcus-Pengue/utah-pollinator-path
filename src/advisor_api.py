"""
Garden Advisor API endpoint.
"""

from flask import request, jsonify
from garden_advisor import ask_advisor_sync


def register_advisor_routes(app):
    """Register advisor routes on Flask app."""
    
    @app.route('/api/advisor/ask', methods=['POST'])
    def ask_advisor():
        """
        Ask the garden advisor a question.
        
        POST /api/advisor/ask
        {
            "question": "What should I plant for monarchs?",
            "context": {
                "city": "Murray",
                "sun": "full_sun",
                "water": "low",
                "existing_plants": ["lavender", "roses"],
                "september_score": 0.2
            }
        }
        """
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({"error": "question required"}), 400
        
        question = data['question']
        user_context = data.get('context', {})
        
        result = ask_advisor_sync(question, user_context)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
    
    @app.route('/api/advisor/quick', methods=['GET'])
    def quick_advice():
        """
        Get quick advice for common questions.
        
        GET /api/advisor/quick?topic=september
        GET /api/advisor/quick?topic=beginner
        GET /api/advisor/quick?topic=drought
        """
        topic = request.args.get('topic', 'beginner')
        
        quick_questions = {
            "september": "What are the 3 most important plants for September monarch migration in Utah?",
            "beginner": "I'm new to gardening. What are 3 easy pollinator plants to start with in Utah?",
            "drought": "What drought-tolerant plants attract the most pollinators in Utah?",
            "shade": "What pollinator plants work in partial shade in Utah?",
            "milkweed": "Which milkweed variety is best for a typical Utah yard?",
            "identify": "How do I tell the difference between a monarch and a painted lady butterfly?",
        }
        
        question = quick_questions.get(topic, quick_questions["beginner"])
        
        result = ask_advisor_sync(question)
        
        if result['success']:
            return jsonify({
                "topic": topic,
                "question": question,
                "answer": result['answer'],
            })
        else:
            return jsonify(result), 500

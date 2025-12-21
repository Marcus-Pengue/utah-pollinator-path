"""
Admin API for observation review.
"""

from flask import request, jsonify
import asyncio
from inat_uploader import (
    get_pending_review,
    get_pending_uploads,
    update_observation_status,
    run_batch_upload,
    get_review_stats,
)
from auth import get_user


def _run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# Simple admin check (replace with proper role system later)
ADMIN_EMAILS = ["marcuspengue@gmail.com", "testuser1@gmail.com"]


def _require_admin():
    """Check if current user is admin."""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, {"error": "Authentication required"}
    
    token = auth_header.split(' ')[1]
    user = _run_async(get_user(token))
    
    if not user.get('success'):
        return None, {"error": "Invalid token"}
    
    if user.get('email') not in ADMIN_EMAILS:
        return None, {"error": "Admin access required"}
    
    return user, None


def register_admin_routes(app):
    """Register admin routes on Flask app."""
    
    @app.route('/api/admin/review/stats', methods=['GET'])
    def admin_review_stats():
        """Get review statistics."""
        user, error = _require_admin()
        if error:
            return jsonify(error), 401 if "Authentication" in error.get("error", "") else 403
        
        stats = _run_async(get_review_stats())
        return jsonify(stats)
    
    @app.route('/api/admin/review/pending', methods=['GET'])
    def admin_pending_review():
        """Get observations pending review."""
        user, error = _require_admin()
        if error:
            return jsonify(error), 401 if "Authentication" in error.get("error", "") else 403
        
        limit = request.args.get('limit', 50, type=int)
        observations = _run_async(get_pending_review(limit=limit))
        
        return jsonify({
            "count": len(observations),
            "observations": observations,
        })
    
    @app.route('/api/admin/review/<observation_id>', methods=['PATCH'])
    def admin_review_observation(observation_id):
        """
        Review an observation.
        
        PATCH /api/admin/review/<id>
        {
            "status": "approved" | "rejected" | "internal_only",
            "observation_type": "wildlife" | "planted",  // optional
            "notes": "Review notes"  // optional
        }
        """
        user, error = _require_admin()
        if error:
            return jsonify(error), 401 if "Authentication" in error.get("error", "") else 403
        
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({"error": "status required"}), 400
        
        status = data['status']
        if status not in ['approved', 'rejected', 'internal_only']:
            return jsonify({"error": "Invalid status"}), 400
        
        result = _run_async(update_observation_status(
            observation_id=observation_id,
            review_status=status,
            reviewer_id=user.get('user_id'),
            review_notes=data.get('notes'),
        ))
        
        # Update observation type if provided
        if data.get('observation_type'):
            # Additional update for type
            pass
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 500
    
    @app.route('/api/admin/review/batch', methods=['POST'])
    def admin_batch_review():
        """
        Batch review multiple observations.
        
        POST /api/admin/review/batch
        {
            "observation_ids": ["id1", "id2"],
            "status": "approved" | "rejected" | "internal_only"
        }
        """
        user, error = _require_admin()
        if error:
            return jsonify(error), 401 if "Authentication" in error.get("error", "") else 403
        
        data = request.get_json()
        if not data or 'observation_ids' not in data or 'status' not in data:
            return jsonify({"error": "observation_ids and status required"}), 400
        
        results = []
        for obs_id in data['observation_ids']:
            result = _run_async(update_observation_status(
                observation_id=obs_id,
                review_status=data['status'],
                reviewer_id=user.get('user_id'),
                review_notes=data.get('notes'),
            ))
            results.append({"id": obs_id, "success": result.get('success')})
        
        return jsonify({
            "processed": len(results),
            "results": results,
        })
    
    @app.route('/api/admin/upload/pending', methods=['GET'])
    def admin_pending_uploads():
        """Get observations approved and ready for iNat upload."""
        user, error = _require_admin()
        if error:
            return jsonify(error), 401 if "Authentication" in error.get("error", "") else 403
        
        limit = request.args.get('limit', 50, type=int)
        observations = _run_async(get_pending_uploads(limit=limit))
        
        return jsonify({
            "count": len(observations),
            "observations": observations,
        })
    
    @app.route('/api/admin/upload/run', methods=['POST'])
    def admin_run_upload():
        """
        Run batch upload to iNaturalist.
        
        POST /api/admin/upload/run
        {"limit": 10}  // optional
        """
        user, error = _require_admin()
        if error:
            return jsonify(error), 401 if "Authentication" in error.get("error", "") else 403
        
        data = request.get_json() or {}
        limit = data.get('limit', 10)
        
        result = _run_async(run_batch_upload(limit=limit))
        return jsonify(result)

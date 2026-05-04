import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

logger = logging.getLogger('frontend')

@require_http_methods(["POST"])
def client_log_view(request):
    """
    Receives JSON logs from the React front-end browser and pipes them cleanly 
    into the Django application logger with a 'frontend' source tag.
    """
    try:
        data = json.loads(request.body)
        level = data.get('level', 'INFO').upper()
        message = data.get('message', 'No message provided')
        context = data.get('context', {})
        
        # Inject standard identifiable properties so Logstash treats it correctly
        extra = {
            'source': 'frontend',
            'frontend_context': context
        }
        
        if request.user and request.user.is_authenticated:
            extra['user_id'] = request.user.id
            
        if level == 'ERROR':
            logger.error(message, extra=extra)
        elif level == 'WARNING':
            logger.warning(message, extra=extra)
        elif level == 'DEBUG':
            logger.debug(message, extra=extra)
        else:
            logger.info(message, extra=extra)
            
        return JsonResponse({"status": "logged"})
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.error(f"Failed to process client log: {e}", extra={"source": "backend"})
        return JsonResponse({"error": "Internal logger error"}, status=500)

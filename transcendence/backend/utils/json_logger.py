import json
import logging
from datetime import datetime, timezone

class JsonFormatter(logging.Formatter):
    """
    A custom Python logging formatter that outputs cleanly structured JSON.
    This replaces standard text logs ("INFO: 2026... user logged in") 
    with pure JSON, optimizing elasticsearch parsing and query building.
    """
    def format(self, record):
        log_record = {
            # ECS standard timestamp format uses @timestamp for ES compatibility
            "@timestamp": datetime.fromtimestamp(record.created, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger_name": record.name,
            "module": record.module,
            "source": getattr(record, "source", "backend"), # Defaults to backend, can be overwritten by frontend
        }
        
        # Inject standard contextual attributes if available
        if hasattr(record, "process"):
            log_record["process"] = record.process
        if hasattr(record, "user_id"):
            log_record["user_id"] = record.user_id
        if hasattr(record, "request_path"):
            log_record["request_path"] = record.request_path
            
        # Catch and embed explicit frontend context
        if hasattr(record, "frontend_context"):
            log_record["frontend_context"] = record.frontend_context
            
        # Extract full python traceback arrays for ELK rendering
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_record)

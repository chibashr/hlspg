"""Logging configuration."""
import os
import logging
import logging.config
from pythonjsonlogger import jsonlogger


def setup_logging(app):
    """Configure logging for the application."""
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_to_stdout = os.getenv('LOG_TO_STDOUT', 'true').lower() == 'true'
    
    handlers = {}
    if log_to_stdout:
        handlers['stdout'] = {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'stream': 'ext://sys.stdout'
        }
    
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': {
                '()': jsonlogger.JsonFormatter,
                'format': '%(asctime)s %(levelname)s %(name)s %(message)s'
            },
            'standard': {
                'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
            }
        },
        'handlers': handlers,
        'root': {
            'level': log_level,
            'handlers': list(handlers.keys())
        },
        'loggers': {
            'werkzeug': {
                'level': 'INFO',
                'handlers': list(handlers.keys()),
                'propagate': False
            },
            'sqlalchemy.engine': {
                'level': 'WARNING',
                'handlers': list(handlers.keys()),
                'propagate': False
            }
        }
    }
    
    logging.config.dictConfig(logging_config)
    app.logger.setLevel(log_level)
    return logging_config


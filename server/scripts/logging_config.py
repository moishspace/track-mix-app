"""
Centralized logging configuration for the Track Mix application.

Usage:
    from logging_config import get_logger

    logger = get_logger(__name__)
    logger.info("This is an info message")
    logger.debug("This is a debug message")
"""

import logging
import sys

# Global log level - change this to control verbosity across all scripts
# Options: logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR
LOG_LEVEL = logging.INFO

def setup_logging(level=LOG_LEVEL):
    """
    Configure the root logger with standard settings.

    Args:
        level: Logging level (logging.DEBUG, logging.INFO, etc.)
    """
    logging.basicConfig(
        level=level,
        format='%(message)s',  # Simple format - just the message
        stream=sys.stdout,     # Use stdout instead of stderr
        force=True             # Override any existing configuration
    )

def get_logger(name=None):
    """
    Get a logger instance with the standard configuration.

    Args:
        name: Logger name (typically __name__ of the calling module)

    Returns:
        logging.Logger: Configured logger instance
    """
    # Ensure logging is configured
    setup_logging()

    # Return logger for the specified name
    return logging.getLogger(name)

# Configure logging when this module is imported
setup_logging()

#!/usr/bin/env python3
"""
Startup script for Golden Nuggets Finder backend.

Usage:
    python run.py              # Run in development mode
    python run.py --prod       # Run in production mode
    python run.py --port 8000  # Run on custom port
"""

import argparse
import os

from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Golden Nuggets Finder Backend")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", 7532)),
        help="Port to run the server on (default: 7532)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host to bind the server to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--prod", action="store_true", help="Run in production mode (no auto-reload)"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (production only)",
    )

    args = parser.parse_args()

    # Configure uvicorn settings with environment-aware logging
    config = {
        "app": "app.main:app",
        "host": args.host,
        "port": args.port,
        "log_level": "info",
    }

    if args.prod:
        # Production settings - enable file logging with rotation
        config.update({
            "workers": args.workers,
            "reload": False,
            "access_log": True,
            "log_config": {
                "version": 1,
                "disable_existing_loggers": False,
                "formatters": {
                    "default": {
                        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    },
                },
                "handlers": {
                    "console": {
                        "class": "logging.StreamHandler",
                        "formatter": "default",
                        "stream": "ext://sys.stdout",
                    },
                    "file": {
                        "class": "logging.handlers.RotatingFileHandler",
                        "formatter": "default",
                        "filename": "server.log",
                        "maxBytes": 10485760,  # 10MB
                        "backupCount": 5,
                    },
                },
                "loggers": {
                    "uvicorn": {"handlers": ["console", "file"], "level": "INFO"},
                    "uvicorn.access": {"handlers": ["console", "file"], "level": "INFO"},
                },
            },
        })
        print(
            f"Starting Golden Nuggets Backend in production mode on {args.host}:{args.port}"
        )
        print("Logs will be written to server.log with rotation")
    else:
        # Development settings - console logging only, no files
        config.update({
            "reload": True,
            "reload_dirs": ["app"],
            "access_log": False,  # Disable access logs in development
            "log_config": {
                "version": 1,
                "disable_existing_loggers": False,
                "formatters": {
                    "default": {
                        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    },
                },
                "handlers": {
                    "console": {
                        "class": "logging.StreamHandler",
                        "formatter": "default",
                        "stream": "ext://sys.stdout",
                    },
                },
                "loggers": {
                    "uvicorn": {"handlers": ["console"], "level": "INFO"},
                    "uvicorn.access": {"handlers": ["console"], "level": "INFO"},
                },
            },
        })
        print(
            f"Starting Golden Nuggets Backend in development mode on {args.host}:{args.port}"
        )
        print("Console logging only - no log files will be created")

    # Verify environment
    if not os.getenv("GEMINI_API_KEY"):
        print("Warning: GEMINI_API_KEY not set. DSPy optimization will not work.")
        print("Please set GEMINI_API_KEY in your .env file or environment.")

    # Run the server
    uvicorn.run(**config)


if __name__ == "__main__":
    main()

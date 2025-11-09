"""
Utility functions for persisting calorie estimation results.

Logs are stored as JSON lines inside the project root `data` directory so they
can be inspected or replayed later. The helpers below abstract the file IO and
provide simple concurrency safety for the FastAPI application.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

# Resolve data directory relative to project root
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
LOG_FILE = DATA_DIR / "calorie_estimations.jsonl"

_lock = threading.Lock()


def log_estimation(entry: Dict[str, Any]) -> None:
    """
    Append a single estimation entry to the JSONL log file.

    Args:
        entry: Dictionary containing both request metadata and response payload.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Attach ISO timestamp to every record
    payload = {
        **entry,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    line = json.dumps(payload, ensure_ascii=True)

    with _lock:
        with LOG_FILE.open("a", encoding="utf-8") as file:
            file.write(line + "\n")


def get_recent_estimations(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Return the most recent estimation entries from the JSONL log.

    Args:
        limit: Maximum number of entries to return.

    Returns:
        List of entries ordered from newest to oldest.
    """
    if limit <= 0:
        return []

    if not LOG_FILE.exists():
        return []

    with _lock:
        with LOG_FILE.open("r", encoding="utf-8") as file:
            lines = file.readlines()

    recent_lines = lines[-limit:]

    entries: List[Dict[str, Any]] = []
    for line in reversed(recent_lines):
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        entries.append(parsed)

    return entries

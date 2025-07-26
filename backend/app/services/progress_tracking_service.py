"""
Progress tracking service for monitoring DSPy optimization runs.

Provides both in-memory (for real-time updates) and persistent
(for historical tracking and recovery) progress tracking.
"""

from datetime import datetime, timezone
import json
from typing import Dict, Optional
import uuid

import aiosqlite


class ProgressTrackingService:
    """Service for tracking optimization progress both in-memory and persistently"""

    def __init__(self):
        # In-memory progress storage for real-time updates
        self.active_progress: Dict[str, dict] = {}

    async def save_progress(
        self,
        db: aiosqlite.Connection,
        run_id: str,
        phase: str,
        progress_percent: int,
        message: str,
        metadata: Optional[dict] = None,
    ):
        """
        Save progress both in-memory (for real-time) and to database (for persistence).

        Args:
            db: Database connection
            run_id: Optimization run ID
            phase: Current phase of optimization
            progress_percent: Progress percentage (0-100, -1 for failed)
            message: Human-readable progress message
            metadata: Optional metadata for the progress entry
        """
        timestamp = datetime.now(timezone.utc).isoformat()

        # Update in-memory progress for real-time access
        progress_data = {
            "step": phase,
            "progress": progress_percent,
            "message": message,
            "timestamp": timestamp,
            "last_updated": timestamp,
        }
        self.active_progress[run_id] = progress_data

        # Save to database for persistence
        progress_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO optimization_progress (
                id, optimization_run_id, phase, progress_percent, 
                message, created_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                progress_id,
                run_id,
                phase,
                progress_percent,
                message,
                timestamp,
                json.dumps(metadata) if metadata else None,
            ),
        )
        await db.commit()

    async def get_progress_history(
        self, db: aiosqlite.Connection, run_id: str
    ) -> list[dict]:
        """
        Get complete progress history for an optimization run.

        Args:
            db: Database connection
            run_id: Optimization run ID

        Returns:
            List of progress entries with timestamps
        """
        cursor = await db.execute(
            """
            SELECT phase, progress_percent, message, created_at, metadata
            FROM optimization_progress
            WHERE optimization_run_id = ?
            ORDER BY created_at ASC
            """,
            (run_id,),
        )

        results = await cursor.fetchall()

        progress_history = []
        for row in results:
            metadata = None
            if row[4]:  # metadata column
                try:
                    metadata = json.loads(row[4])
                except json.JSONDecodeError:
                    metadata = None

            progress_history.append(
                {
                    "phase": row[0],
                    "progress": row[1],
                    "message": row[2],
                    "timestamp": row[3],
                    "metadata": metadata,
                }
            )

        return progress_history

    def get_run_progress(self, run_id: str) -> Optional[dict]:
        """
        Get current in-memory progress for a run (for real-time updates).

        Args:
            run_id: Optimization run ID

        Returns:
            Current progress data or None if not found
        """
        return self.active_progress.get(run_id)

    def get_all_active_runs(self) -> Dict[str, dict]:
        """
        Get all active runs from in-memory storage.

        Returns:
            Dictionary mapping run_id to progress data
        """
        return self.active_progress.copy()

    def complete_run(self, run_id: str):
        """
        Mark a run as complete and remove from active tracking.

        Args:
            run_id: Optimization run ID
        """
        if run_id in self.active_progress:
            del self.active_progress[run_id]

    def fail_run(self, run_id: str, error_message: str):
        """
        Mark a run as failed and remove from active tracking.

        Args:
            run_id: Optimization run ID
            error_message: Error description
        """
        if run_id in self.active_progress:
            # Update progress to show failure
            self.active_progress[run_id].update(
                {
                    "step": "failed",
                    "progress": -1,
                    "message": f"❌ {error_message}",
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                }
            )

    async def cleanup_old_progress(self, db: aiosqlite.Connection, days_old: int = 30):
        """
        Clean up old progress entries from database.

        Args:
            db: Database connection
            days_old: Delete entries older than this many days
        """
        await db.execute(
            f"""
            DELETE FROM optimization_progress
            WHERE created_at < datetime('now', '-{days_old} days')
            """
        )
        await db.commit()

    async def get_recent_activity(
        self, db: aiosqlite.Connection, limit: int = 10
    ) -> list[dict]:
        """
        Get recent optimization activity across all runs.

        Args:
            db: Database connection
            limit: Maximum number of activity entries to return

        Returns:
            List of recent activity entries
        """
        cursor = await db.execute(
            """
            SELECT 
                op.optimization_run_id,
                or_main.mode,
                op.phase,
                op.progress_percent,
                op.message,
                op.created_at,
                or_main.status as run_status
            FROM optimization_progress op
            LEFT JOIN optimization_runs or_main ON op.optimization_run_id = or_main.id
            ORDER BY op.created_at DESC
            LIMIT ?
            """,
            (limit,),
        )

        results = await cursor.fetchall()

        activity = []
        for row in results:
            activity.append(
                {
                    "run_id": row[0],
                    "mode": row[1],
                    "phase": row[2],
                    "progress": row[3],
                    "message": row[4],
                    "timestamp": row[5],
                    "run_status": row[6],
                }
            )

        return activity

    async def restore_active_runs(self, db: aiosqlite.Connection):
        """
        Restore active runs from database on service startup.
        Useful for recovering in-memory state after server restart.

        Args:
            db: Database connection
        """
        # Get currently running optimization runs
        cursor = await db.execute(
            """
            SELECT id FROM optimization_runs 
            WHERE status = 'running'
            """
        )
        running_runs = await cursor.fetchall()

        # For each running run, get latest progress
        for (run_id,) in running_runs:
            cursor = await db.execute(
                """
                SELECT phase, progress_percent, message, created_at
                FROM optimization_progress
                WHERE optimization_run_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (run_id,),
            )

            latest_progress = await cursor.fetchone()

            if latest_progress:
                self.active_progress[run_id] = {
                    "step": latest_progress[0],
                    "progress": latest_progress[1],
                    "message": latest_progress[2],
                    "timestamp": latest_progress[3],
                    "last_updated": latest_progress[3],
                }

"""
Feedback service for handling all feedback-related database operations.

Manages storage, retrieval, and analysis of user feedback for both
nugget ratings/corrections and missing content submissions.
"""

from datetime import datetime
import json
import uuid

import aiosqlite

from ..models import MissingContentFeedback, NuggetFeedback


class FeedbackService:
    """Service for managing feedback data and statistics"""

    async def store_nugget_feedback(
        self, db: aiosqlite.Connection, feedback: NuggetFeedback
    ):
        """Store nugget feedback in database"""
        await db.execute(
            """
            INSERT INTO nugget_feedback (
                id, nugget_content, original_type, corrected_type,
                rating, timestamp, url, context, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                feedback.id,
                feedback.nuggetContent,
                feedback.originalType,
                feedback.correctedType,
                feedback.rating,
                feedback.timestamp,
                feedback.url,
                feedback.context,
                datetime.now(),
            ),
        )
        await db.commit()

    async def store_missing_content_feedback(
        self, db: aiosqlite.Connection, feedback: MissingContentFeedback
    ):
        """Store missing content feedback in database"""
        await db.execute(
            """
            INSERT INTO missing_content_feedback (
                id, content, suggested_type, timestamp, url, context, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                feedback.id,
                feedback.content,
                feedback.suggestedType,
                feedback.timestamp,
                feedback.url,
                feedback.context,
                datetime.now(),
            ),
        )
        await db.commit()

    async def get_feedback_stats(self, db: aiosqlite.Connection) -> dict:
        """
        Get comprehensive feedback statistics including optimization triggers.

        Implements the threshold logic:
        - 7+ days + 25+ feedback, OR
        - 75+ total feedback, OR
        - 15+ feedback with 40%+ negative rate
        """
        # Get total feedback counts
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative
            FROM nugget_feedback
        """)
        stats = await cursor.fetchone()
        if stats is None:
            total_feedback = positive_count = negative_count = 0
        else:
            total_feedback = stats[0] or 0
            positive_count = stats[1] or 0
            negative_count = stats[2] or 0

        # Get recent negative rate (last 20 items for recent trend analysis)
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative
            FROM (
                SELECT rating
                FROM nugget_feedback
                ORDER BY created_at DESC
                LIMIT 20
            )
        """)
        recent_stats = await cursor.fetchone()
        if recent_stats is None:
            recent_total = recent_negative = 0
        else:
            recent_total = recent_stats[0] or 0
            recent_negative = recent_stats[1] or 0
        recent_negative_rate = (
            (recent_negative / recent_total) if recent_total > 0 else 0.0
        )

        # Get last optimization date
        cursor = await db.execute("""
            SELECT MAX(completed_at) as last_optimization
            FROM optimization_runs
            WHERE status = 'completed'
        """)
        last_opt_result = await cursor.fetchone()
        last_optimization_date = (
            last_opt_result[0] if last_opt_result and last_opt_result[0] else None
        )

        # Calculate days since last optimization
        if last_optimization_date:
            try:
                # Parse the datetime string from database
                last_opt_dt = datetime.fromisoformat(
                    last_optimization_date.replace("Z", "+00:00")
                )
                days_since = (datetime.now() - last_opt_dt).days
            except:
                days_since = 999  # Fallback if parsing fails
        else:
            days_since = 999  # No previous optimization

        # Determine if optimization should be triggered
        should_optimize = False
        trigger_reason = "No optimization needed"

        # Threshold 1: 7+ days + 25+ feedback
        if days_since >= 7 and total_feedback >= 25:
            should_optimize = True
            trigger_reason = (
                f"Time-based: {days_since} days + {total_feedback} feedback items"
            )

        # Threshold 2: 75+ total feedback
        elif total_feedback >= 75:
            should_optimize = True
            trigger_reason = f"Volume-based: {total_feedback} total feedback items"

        # Threshold 3: 15+ feedback with 40%+ negative rate
        elif total_feedback >= 15 and recent_negative_rate >= 0.40:
            should_optimize = True
            trigger_reason = f"Quality-based: {total_feedback} feedback with {recent_negative_rate:.1%} recent negative rate"

        else:
            # Determine next trigger condition
            if total_feedback < 15:
                trigger_reason = f"Need {15 - total_feedback} more feedback items for quality-based trigger"
            elif total_feedback < 25:
                trigger_reason = f"Need {25 - total_feedback} more feedback items for time-based trigger"
            elif total_feedback < 75:
                if days_since < 7:
                    trigger_reason = f"Need {7 - days_since} more days OR {75 - total_feedback} more feedback items"
                else:
                    trigger_reason = f"Need {75 - total_feedback} more feedback items for volume trigger"
            else:
                trigger_reason = (
                    "All thresholds met but optimization recently completed"
                )

        return {
            "totalFeedback": total_feedback,
            "positiveCount": positive_count,
            "negativeCount": negative_count,
            "lastOptimizationDate": last_optimization_date,
            "daysSinceLastOptimization": days_since,
            "recentNegativeRate": round(recent_negative_rate, 3),
            "shouldOptimize": should_optimize,
            "nextOptimizationTrigger": trigger_reason,
        }

    async def get_training_examples(
        self, db: aiosqlite.Connection, limit: int = 100
    ) -> list[dict]:
        """
        Generate training examples for DSPy optimization from feedback data.

        Combines nugget feedback and missing content feedback to create
        training examples with quality scores based on user ratings.
        """
        training_examples = []

        # Get positive nugget examples (high quality)
        cursor = await db.execute(
            """
            SELECT nf.nugget_content, nf.original_type, nf.url, nf.context, nf.created_at,
                   CASE WHEN nf.corrected_type IS NOT NULL THEN nf.corrected_type ELSE nf.original_type END as final_type
            FROM nugget_feedback nf
            WHERE nf.rating = 'positive'
            ORDER BY nf.created_at DESC
            LIMIT ?
        """,
            (limit // 2,),
        )

        positive_examples = await cursor.fetchall()

        for example in positive_examples:
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": [
                            {
                                "type": example[5],  # final_type
                                "content": example[0],  # nugget_content
                                "synthesis": f"High-quality {example[5]} identified by user feedback",
                            }
                        ]
                    },
                    "feedback_score": 1.0,  # Positive feedback
                    "url": example[2],
                    "timestamp": example[4],
                }
            )

        # Get negative nugget examples (lower quality - what NOT to extract)
        cursor = await db.execute(
            """
            SELECT nf.nugget_content, nf.original_type, nf.url, nf.context, nf.created_at,
                   CASE WHEN nf.corrected_type IS NOT NULL THEN nf.corrected_type ELSE nf.original_type END as final_type
            FROM nugget_feedback nf
            WHERE nf.rating = 'negative'
            ORDER BY nf.created_at DESC
            LIMIT ?
        """,
            (limit // 4,),
        )

        negative_examples = await cursor.fetchall()

        for example in negative_examples:
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": []  # Empty - this shouldn't be extracted
                    },
                    "feedback_score": 0.0,  # Negative feedback
                    "url": example[2],
                    "timestamp": example[4],
                }
            )

        # Get missing content examples (what should have been extracted)
        cursor = await db.execute(
            """
            SELECT mcf.content, mcf.suggested_type, mcf.url, mcf.context, mcf.created_at
            FROM missing_content_feedback mcf
            ORDER BY mcf.created_at DESC
            LIMIT ?
        """,
            (limit // 4,),
        )

        missing_examples = await cursor.fetchall()

        for example in missing_examples:
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": [
                            {
                                "type": example[1],  # suggested_type
                                "content": example[0],  # content
                                "synthesis": f"User-identified {example[1]} that was missed",
                            }
                        ]
                    },
                    "feedback_score": 0.8,  # High quality but manually identified
                    "url": example[2],
                    "timestamp": example[4],
                }
            )

        return training_examples

    async def store_training_examples(
        self, db: aiosqlite.Connection, examples: list[dict]
    ):
        """Store training examples in database for DSPy optimization"""
        for example in examples:
            await db.execute(
                """
                INSERT OR REPLACE INTO training_examples (
                    id, input_content, expected_output, feedback_score, url, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    example["id"],
                    example["input_content"],
                    json.dumps(example["expected_output"]),
                    example["feedback_score"],
                    example["url"],
                    example["timestamp"],
                ),
            )
        await db.commit()

    async def get_feedback_by_url(self, db: aiosqlite.Connection, url: str) -> dict:
        """Get all feedback for a specific URL"""
        # Get nugget feedback
        cursor = await db.execute(
            """
            SELECT * FROM nugget_feedback WHERE url = ? ORDER BY created_at DESC
        """,
            (url,),
        )
        nugget_feedback = list(await cursor.fetchall())

        # Get missing content feedback
        cursor = await db.execute(
            """
            SELECT * FROM missing_content_feedback WHERE url = ? ORDER BY created_at DESC
        """,
            (url,),
        )
        missing_feedback = list(await cursor.fetchall())

        return {
            "url": url,
            "nuggetFeedback": nugget_feedback,
            "missingContentFeedback": missing_feedback,
            "totalItems": len(nugget_feedback) + len(missing_feedback),
        }

"""
Feedback service for handling all feedback-related database operations.

Manages storage, retrieval, and analysis of user feedback for both
nugget ratings/corrections and missing content submissions.
"""

from datetime import datetime, timezone
import uuid
from typing import Optional

import aiosqlite

from ..models import MissingContentFeedback, NuggetFeedback


class FeedbackService:
    """Service for managing feedback data and statistics"""

    async def store_nugget_feedback(
        self, db: aiosqlite.Connection, feedback: NuggetFeedback
    ):
        """Store nugget feedback in database with deduplication"""
        current_time = datetime.now(timezone.utc)

        # Check for existing record with same content, URL, and original type
        cursor = await db.execute(
            """
            SELECT id, report_count, first_reported_at 
            FROM nugget_feedback 
            WHERE nugget_content = ? AND url = ? AND original_type = ?
            """,
            (feedback.nuggetContent, feedback.url, feedback.originalType),
        )
        existing = await cursor.fetchone()

        if existing:
            # Found duplicate - increment report count and update timestamps/fields
            existing_id, current_count, first_reported = existing
            await db.execute(
                """
                UPDATE nugget_feedback 
                SET report_count = ?, 
                    last_reported_at = ?,
                    context = ?,
                    corrected_type = ?,
                    rating = ?
                WHERE id = ?
                """,
                (
                    current_count + 1,
                    current_time,
                    feedback.context,
                    feedback.correctedType,
                    feedback.rating,
                    existing_id,
                ),
            )

            # Update the feedback ID to return the existing record's ID
            feedback.id = existing_id

        else:
            # No duplicate found - insert new record
            await db.execute(
                """
                INSERT INTO nugget_feedback (
                    id, nugget_content, original_type, corrected_type,
                    rating, timestamp, url, context, created_at,
                    report_count, first_reported_at, last_reported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    current_time,
                    1,  # report_count
                    current_time,  # first_reported_at
                    current_time,  # last_reported_at
                ),
            )

        await db.commit()

        # Return whether this was a duplicate for API response
        return existing is not None

    async def store_missing_content_feedback(
        self, db: aiosqlite.Connection, feedback: MissingContentFeedback
    ):
        """Store missing content feedback in database with deduplication"""
        current_time = datetime.now(timezone.utc)

        # Check for existing record with same content and URL
        cursor = await db.execute(
            """
            SELECT id, report_count, first_reported_at 
            FROM missing_content_feedback 
            WHERE content = ? AND url = ?
            """,
            (feedback.content, feedback.url),
        )
        existing = await cursor.fetchone()

        if existing:
            # Found duplicate - increment report count and update timestamps
            existing_id, current_count, first_reported = existing
            await db.execute(
                """
                UPDATE missing_content_feedback 
                SET report_count = ?, 
                    last_reported_at = ?,
                    context = ?
                WHERE id = ?
                """,
                (current_count + 1, current_time, feedback.context, existing_id),
            )

            # Update the feedback ID to return the existing record's ID
            # This ensures consistent behavior for the API response
            feedback.id = existing_id

        else:
            # No duplicate found - insert new record
            await db.execute(
                """
                INSERT INTO missing_content_feedback (
                    id, content, suggested_type, timestamp, url, context, 
                    created_at, report_count, first_reported_at, last_reported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    feedback.id,
                    feedback.content,
                    feedback.suggestedType,
                    feedback.timestamp,
                    feedback.url,
                    feedback.context,
                    current_time,
                    1,  # report_count
                    current_time,  # first_reported_at
                    current_time,  # last_reported_at
                ),
            )

        await db.commit()

        # Return whether this was a duplicate for API response
        return existing is not None

    async def get_deduplication_info(
        self, db: aiosqlite.Connection, feedback_id: str, feedback_type: str
    ) -> dict:
        """Get deduplication information for a feedback item"""
        if feedback_type == "nugget":
            cursor = await db.execute(
                """
                SELECT report_count, first_reported_at, last_reported_at
                FROM nugget_feedback 
                WHERE id = ?
                """,
                (feedback_id,),
            )
        else:  # missing_content
            cursor = await db.execute(
                """
                SELECT report_count, first_reported_at, last_reported_at
                FROM missing_content_feedback 
                WHERE id = ?
                """,
                (feedback_id,),
            )

        result = await cursor.fetchone()
        if result:
            report_count, first_reported_at, last_reported_at = result
            return {
                "report_count": report_count,
                "first_reported_at": first_reported_at,
                "last_reported_at": last_reported_at,
                "is_duplicate": report_count > 1,
            }

        return {
            "report_count": 1,
            "first_reported_at": None,
            "last_reported_at": None,
            "is_duplicate": False,
        }

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
                days_since = (datetime.now(timezone.utc) - last_opt_dt).days
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

    # New methods for dashboard functionality

    async def get_pending_feedback(
        self,
        db: aiosqlite.Connection,
        limit: int = 50,
        offset: int = 0,
        feedback_type: str = "all",
    ) -> dict:
        """
        Get unprocessed feedback items for the dashboard queue.

        Args:
            db: Database connection
            limit: Maximum number of items to return
            offset: Offset for pagination
            feedback_type: Filter by type ('all', 'nugget', 'missing_content')

        Returns:
            Dictionary with pending feedback items and pagination info
        """
        items = []
        total_count = 0

        if feedback_type in ["all", "nugget"]:
            # Get pending nugget feedback
            cursor = await db.execute(
                """
                SELECT 
                    'nugget' as feedback_type,
                    id, nugget_content as content, rating, 
                    original_type, corrected_type, url, 
                    processed, last_used_at, usage_count,
                    timestamp, created_at
                FROM nugget_feedback 
                WHERE processed = FALSE
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                (limit if feedback_type == "nugget" else limit // 2, offset),
            )

            nugget_items = await cursor.fetchall()

            for item in nugget_items:
                items.append(
                    {
                        "type": item[0],
                        "id": item[1],
                        "content": item[2],
                        "rating": item[3],
                        "original_type": item[4],
                        "corrected_type": item[5],
                        "url": item[6],
                        "processed": item[7],
                        "last_used_at": item[8],
                        "usage_count": item[9],
                        "client_timestamp": item[10],
                        "created_at": item[11],
                    }
                )

        if feedback_type in ["all", "missing_content"]:
            # Get pending missing content feedback
            remaining_limit = (
                limit if feedback_type == "missing_content" else limit - len(items)
            )

            cursor = await db.execute(
                """
                SELECT 
                    'missing_content' as feedback_type,
                    id, content, suggested_type, url, 
                    processed, last_used_at, usage_count,
                    timestamp, created_at
                FROM missing_content_feedback 
                WHERE processed = FALSE
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                (remaining_limit, offset),
            )

            missing_items = await cursor.fetchall()

            for item in missing_items:
                items.append(
                    {
                        "type": item[0],
                        "id": item[1],
                        "content": item[2],
                        "suggested_type": item[3],
                        "url": item[4],
                        "processed": item[5],
                        "last_used_at": item[6],
                        "usage_count": item[7],
                        "client_timestamp": item[8],
                        "created_at": item[9],
                    }
                )

        # Get total count for pagination
        if feedback_type == "all":
            cursor = await db.execute(
                """
                SELECT 
                    (SELECT COUNT(*) FROM nugget_feedback WHERE processed = FALSE) +
                    (SELECT COUNT(*) FROM missing_content_feedback WHERE processed = FALSE)
                    as total_count
                """
            )
        elif feedback_type == "nugget":
            cursor = await db.execute(
                "SELECT COUNT(*) FROM nugget_feedback WHERE processed = FALSE"
            )
        else:  # missing_content
            cursor = await db.execute(
                "SELECT COUNT(*) FROM missing_content_feedback WHERE processed = FALSE"
            )

        result = await cursor.fetchone()
        total_count = result[0] if result else 0

        # Sort combined items by created_at if showing all types
        if feedback_type == "all":
            items.sort(key=lambda x: x["created_at"], reverse=True)

        return {
            "items": items[:limit],
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(items) < total_count,
        }

    async def get_recent_feedback(
        self, db: aiosqlite.Connection, limit: int = 20, include_processed: bool = True
    ) -> list[dict]:
        """
        Get recent feedback items with processing status.

        Args:
            db: Database connection
            limit: Maximum number of items to return
            include_processed: Whether to include processed items

        Returns:
            List of recent feedback items
        """
        processed_filter = "" if include_processed else "WHERE processed = FALSE"

        cursor = await db.execute(
            f"""
            SELECT * FROM recent_feedback_with_status
            {processed_filter}
            LIMIT ?
        """,
            (limit,),
        )

        results = await cursor.fetchall()

        items = []
        for row in results:
            items.append(
                {
                    "type": row[0],
                    "id": row[1],
                    "content": row[2],
                    "rating": row[3] if row[3] else None,
                    "url": row[4],
                    "processed": row[5],
                    "last_used_at": row[6],
                    "usage_count": row[7],
                    "created_at": row[8],
                    "client_timestamp": row[9],
                }
            )

        return items

    async def mark_feedback_used(
        self,
        db: aiosqlite.Connection,
        feedback_items: list[dict],
        optimization_run_id: str,
    ):
        """
        Mark feedback items as processed/used and create usage records.

        Args:
            db: Database connection
            feedback_items: List of feedback items with type and id
            optimization_run_id: ID of the optimization run using this feedback
        """
        current_time = datetime.now(timezone.utc).isoformat() + "Z"

        for item in feedback_items:
            feedback_type = item["type"]  # 'nugget' or 'missing_content'
            feedback_id = item["id"]
            contribution_score = item.get("contribution_score", 1.0)

            # Update the feedback table
            if feedback_type == "nugget":
                await db.execute(
                    """
                    UPDATE nugget_feedback 
                    SET processed = TRUE, 
                        last_used_at = ?, 
                        usage_count = usage_count + 1
                    WHERE id = ?
                    """,
                    (current_time, feedback_id),
                )
            else:  # missing_content
                await db.execute(
                    """
                    UPDATE missing_content_feedback 
                    SET processed = TRUE, 
                        last_used_at = ?, 
                        usage_count = usage_count + 1
                    WHERE id = ?
                    """,
                    (current_time, feedback_id),
                )

            # Create usage record
            usage_id = str(uuid.uuid4())
            await db.execute(
                """
                INSERT INTO feedback_usage (
                    id, optimization_run_id, feedback_type, 
                    feedback_id, contribution_score, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    usage_id,
                    optimization_run_id,
                    feedback_type,
                    feedback_id,
                    contribution_score,
                    current_time,
                ),
            )

        await db.commit()

    async def get_feedback_usage_stats(self, db: aiosqlite.Connection) -> dict:
        """
        Get statistics about feedback usage across optimizations.

        Args:
            db: Database connection

        Returns:
            Dictionary with usage statistics
        """
        # Get overall usage stats
        cursor = await db.execute("""
            SELECT 
                COUNT(DISTINCT feedback_id) as unique_feedback_used,
                COUNT(*) as total_usage_records,
                AVG(contribution_score) as avg_contribution_score
            FROM feedback_usage
        """)

        overall_stats = await cursor.fetchone()

        # Get usage by feedback type
        cursor = await db.execute("""
            SELECT 
                feedback_type,
                COUNT(DISTINCT feedback_id) as unique_items,
                COUNT(*) as total_uses,
                AVG(contribution_score) as avg_score
            FROM feedback_usage
            GROUP BY feedback_type
        """)

        usage_by_type = await cursor.fetchall()

        # Get most frequently used feedback
        cursor = await db.execute("""
            SELECT 
                fu.feedback_type,
                fu.feedback_id,
                COUNT(*) as use_count,
                MAX(fu.created_at) as last_used,
                AVG(fu.contribution_score) as avg_score
            FROM feedback_usage fu
            GROUP BY fu.feedback_type, fu.feedback_id
            ORDER BY use_count DESC
            LIMIT 10
        """)

        frequent_feedback = await cursor.fetchall()

        return {
            "total_unique_used": overall_stats[0]
            if overall_stats and overall_stats[0]
            else 0,
            "total_usage_records": overall_stats[1]
            if overall_stats and overall_stats[1]
            else 0,
            "average_contribution": overall_stats[2]
            if overall_stats and overall_stats[2]
            else 0.0,
            "usage_by_type": {
                row[0]: {
                    "unique_items": row[1] if row[1] else 0,
                    "total_uses": row[2] if row[2] else 0,
                    "avg_score": row[3] if row[3] else 0.0,
                }
                for row in usage_by_type
            },
            "most_used_feedback": [
                {
                    "type": row[0],
                    "id": row[1],
                    "use_count": row[2] if row[2] else 0,
                    "last_used": row[3] if row[3] else "",
                    "avg_score": row[4] if row[4] else 0.0,
                }
                for row in frequent_feedback
            ],
        }

    async def get_feedback_item_details(
        self, db: aiosqlite.Connection, feedback_id: str, feedback_type: str
    ) -> Optional[dict]:
        """
        Get detailed information about a specific feedback item.

        Args:
            db: Database connection
            feedback_id: ID of the feedback item
            feedback_type: Type of feedback ('nugget' or 'missing_content')

        Returns:
            Detailed feedback information or None if not found
        """
        if feedback_type == "nugget":
            cursor = await db.execute(
                """
                SELECT 
                    id, nugget_content, original_type, corrected_type,
                    rating, url, context, processed, last_used_at,
                    usage_count, timestamp, created_at
                FROM nugget_feedback
                WHERE id = ?
                """,
                (feedback_id,),
            )
        else:  # missing_content
            cursor = await db.execute(
                """
                SELECT 
                    id, content, suggested_type, url, context,
                    processed, last_used_at, usage_count, 
                    timestamp, created_at
                FROM missing_content_feedback
                WHERE id = ?
                """,
                (feedback_id,),
            )

        result = await cursor.fetchone()

        if not result:
            return None

        # Get usage history for this feedback
        cursor = await db.execute(
            """
            SELECT 
                fu.optimization_run_id,
                fu.contribution_score,
                fu.created_at,
                or_main.mode,
                or_main.status
            FROM feedback_usage fu
            LEFT JOIN optimization_runs or_main ON fu.optimization_run_id = or_main.id
            WHERE fu.feedback_id = ? AND fu.feedback_type = ?
            ORDER BY fu.created_at DESC
            """,
            (feedback_id, feedback_type),
        )

        usage_history = await cursor.fetchall()

        if feedback_type == "nugget":
            return {
                "type": "nugget",
                "id": result[0],
                "content": result[1],
                "original_type": result[2],
                "corrected_type": result[3],
                "rating": result[4],
                "url": result[5],
                "context": result[6],
                "processed": result[7],
                "last_used_at": result[8],
                "usage_count": result[9],
                "client_timestamp": result[10],
                "created_at": result[11],
                "usage_history": [
                    {
                        "run_id": row[0],
                        "contribution_score": row[1],
                        "used_at": row[2],
                        "optimization_mode": row[3],
                        "run_status": row[4],
                    }
                    for row in usage_history
                ],
            }
        else:
            return {
                "type": "missing_content",
                "id": result[0],
                "content": result[1],
                "suggested_type": result[2],
                "url": result[3],
                "context": result[4],
                "processed": result[5],
                "last_used_at": result[6],
                "usage_count": result[7],
                "client_timestamp": result[8],
                "created_at": result[9],
                "usage_history": [
                    {
                        "run_id": row[0],
                        "contribution_score": row[1],
                        "used_at": row[2],
                        "optimization_mode": row[3],
                        "run_status": row[4],
                    }
                    for row in usage_history
                ],
            }

    async def update_feedback_item(
        self, 
        db: aiosqlite.Connection, 
        feedback_id: str, 
        feedback_type: str,
        updates: dict
    ) -> bool:
        """
        Update a feedback item.

        Args:
            db: Database connection
            feedback_id: ID of the feedback item
            feedback_type: Type of feedback ('nugget' or 'missing_content')
            updates: Dictionary of fields to update

        Returns:
            True if item was updated, False if not found
        """
        if feedback_type == "nugget":
            # Build dynamic update query for nugget feedback
            valid_fields = ['nugget_content', 'rating', 'corrected_type', 'context']
            update_fields = []
            update_values = []
            
            for field, value in updates.items():
                if field == 'content':  # Map 'content' to 'nugget_content'
                    field = 'nugget_content'
                if field in valid_fields:
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)
            
            if not update_fields:
                return False
                
            update_values.append(feedback_id)
            query = f"""
                UPDATE nugget_feedback 
                SET {', '.join(update_fields)}
                WHERE id = ?
            """
            
        else:  # missing_content
            # Build dynamic update query for missing content feedback
            valid_fields = ['content', 'suggested_type', 'context']
            update_fields = []
            update_values = []
            
            for field, value in updates.items():
                if field in valid_fields:
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)
            
            if not update_fields:
                return False
                
            update_values.append(feedback_id)
            query = f"""
                UPDATE missing_content_feedback 
                SET {', '.join(update_fields)}
                WHERE id = ?
            """

        cursor = await db.execute(query, update_values)
        await db.commit()
        
        return cursor.rowcount > 0

    async def delete_feedback_item(
        self, 
        db: aiosqlite.Connection, 
        feedback_id: str, 
        feedback_type: str
    ) -> bool:
        """
        Delete a feedback item and its usage records.

        Args:
            db: Database connection
            feedback_id: ID of the feedback item
            feedback_type: Type of feedback ('nugget' or 'missing_content')

        Returns:
            True if item was deleted, False if not found
        """
        # First delete usage records
        await db.execute(
            """
            DELETE FROM feedback_usage 
            WHERE feedback_id = ? AND feedback_type = ?
            """,
            (feedback_id, feedback_type),
        )

        # Then delete the feedback item
        if feedback_type == "nugget":
            cursor = await db.execute(
                "DELETE FROM nugget_feedback WHERE id = ?",
                (feedback_id,),
            )
        else:  # missing_content
            cursor = await db.execute(
                "DELETE FROM missing_content_feedback WHERE id = ?",
                (feedback_id,),
            )

        await db.commit()
        return cursor.rowcount > 0

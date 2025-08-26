"""
Feedback service for handling all feedback-related database operations.

Manages storage, retrieval, and analysis of user feedback for both
nugget ratings/corrections and missing content submissions.
"""

from datetime import datetime, timezone
import logging
from typing import Literal, Optional
import uuid

import aiosqlite

from ..models import MissingContentFeedback, NuggetFeedback

# Setup logger
logger = logging.getLogger(__name__)


def extract_first_words(text: str, max_words: int = 5) -> str:
    """
    Extract the first few words from text for startContent format.
    
    Args:
        text: The text to extract words from
        max_words: Maximum number of words to extract (default: 5)
        
    Returns:
        String containing the first words, up to max_words
    """
    if not text or not text.strip():
        return ""
    
    words = text.strip().split()
    return ' '.join(words[:max_words])


def extract_last_words(text: str, max_words: int = 5) -> str:
    """
    Extract the last few words from text for endContent format.
    
    Args:
        text: The text to extract words from
        max_words: Maximum number of words to extract (default: 5)
        
    Returns:
        String containing the last words, up to max_words
    """
    if not text or not text.strip():
        return ""
    
    words = text.strip().split()
    return ' '.join(words[-max_words:])


def validate_content_markers(start_content: str, end_content: str, max_words: int = 5) -> bool:
    """
    Validate that content markers don't exceed word limits.
    
    Args:
        start_content: The startContent string to validate
        end_content: The endContent string to validate
        max_words: Maximum allowed words per marker (default: 5)
        
    Returns:
        True if both markers are within limits, False otherwise
    """
    if not start_content or not end_content:
        return False
    
    start_word_count = len(start_content.strip().split())
    end_word_count = len(end_content.strip().split())
    
    return start_word_count <= max_words and end_word_count <= max_words


class FeedbackService:
    """Service for managing feedback data and statistics"""

    def _compare_nugget_feedback(
        self,
        new_feedback: NuggetFeedback,
        existing_rating: str,
        existing_corrected_type: Optional[str],
        existing_context: str,
    ) -> bool:
        """
        Compare new feedback with existing values to determine if it's truly different.

        Returns True if values are identical (true duplicate), False if different (update).
        """
        # Compare rating
        if new_feedback.rating != existing_rating:
            return False

        # Compare corrected_type (handle None values)
        if new_feedback.correctedType != existing_corrected_type:
            return False

        # Compare context
        return new_feedback.context == existing_context

    def _compare_missing_content_feedback(
        self,
        new_feedback: MissingContentFeedback,
        existing_suggested_type: str,
        existing_context: str,
    ) -> bool:
        """
        Compare new missing content feedback with existing values.

        Returns True if values are identical (true duplicate), False if different (update).
        """
        # Compare suggested_type
        if new_feedback.suggestedType != existing_suggested_type:
            return False

        # Compare context
        return new_feedback.context == existing_context

    async def store_nugget_feedback(
        self, db: aiosqlite.Connection, feedback: NuggetFeedback
    ) -> Literal["new", "updated", "duplicate"]:
        """Store nugget feedback in database with smart deduplication"""
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
            # Found existing record - need to determine if it's duplicate or update
            existing_id, current_count, first_reported = existing

            # Get existing values for comparison
            comparison_cursor = await db.execute(
                """
                SELECT rating, corrected_type, context
                FROM nugget_feedback
                WHERE id = ?
                """,
                (existing_id,),
            )
            existing_values = await comparison_cursor.fetchone()

            if existing_values:
                existing_rating, existing_corrected_type, existing_context = (
                    existing_values
                )

                # Compare with new feedback to determine if it's truly identical
                is_identical = self._compare_nugget_feedback(
                    feedback, existing_rating, existing_corrected_type, existing_context
                )

                if is_identical:
                    # True duplicate - just increment report count
                    await db.execute(
                        """
                        UPDATE nugget_feedback
                        SET report_count = ?,
                            last_reported_at = ?
                        WHERE id = ?
                        """,
                        (current_count + 1, current_time, existing_id),
                    )
                    feedback.id = existing_id
                    await db.commit()
                    return "duplicate"
                else:
                    # Update - increment count and update fields
                    await db.execute(
                        """
                        UPDATE nugget_feedback
                        SET report_count = ?,
                            last_reported_at = ?,
                            context = ?,
                            corrected_type = ?,
                            rating = ?,
                            model_provider = ?,
                            model_name = ?
                        WHERE id = ?
                        """,
                        (
                            current_count + 1,
                            current_time,
                            feedback.context,
                            feedback.correctedType,
                            feedback.rating,
                            feedback.modelProvider,  # NEW
                            feedback.modelName,  # NEW
                            existing_id,
                        ),
                    )
                    feedback.id = existing_id
                    await db.commit()
                    return "updated"
            else:
                # This shouldn't happen, but fallback to update behavior
                await db.execute(
                    """
                    UPDATE nugget_feedback
                    SET report_count = ?,
                        last_reported_at = ?,
                        context = ?,
                        corrected_type = ?,
                        rating = ?,
                        model_provider = ?,
                        model_name = ?
                    WHERE id = ?
                    """,
                    (
                        current_count + 1,
                        current_time,
                        feedback.context,
                        feedback.correctedType,
                        feedback.rating,
                        feedback.modelProvider,  # NEW
                        feedback.modelName,  # NEW
                        existing_id,
                    ),
                )
                feedback.id = existing_id
                await db.commit()
                return "updated"

        else:
            # No existing record found - insert new record
            await db.execute(
                """
                INSERT INTO nugget_feedback (
                    id, nugget_content, original_type, corrected_type,
                    rating, client_timestamp, url, context, created_at,
                    report_count, first_reported_at, last_reported_at,
                    model_provider, model_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    feedback.modelProvider,  # NEW
                    feedback.modelName,  # NEW
                ),
            )
            await db.commit()
            return "new"

    async def store_missing_content_feedback(
        self, db: aiosqlite.Connection, feedback: MissingContentFeedback
    ) -> Literal["new", "updated", "duplicate"]:
        """Store missing content feedback in database with smart deduplication"""
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
            # Found existing record - need to determine if it's duplicate or update
            existing_id, current_count, first_reported = existing

            # Get existing values for comparison
            comparison_cursor = await db.execute(
                """
                SELECT suggested_type, context
                FROM missing_content_feedback
                WHERE id = ?
                """,
                (existing_id,),
            )
            existing_values = await comparison_cursor.fetchone()

            if existing_values:
                existing_suggested_type, existing_context = existing_values

                # Compare with new feedback to determine if it's truly identical
                is_identical = self._compare_missing_content_feedback(
                    feedback, existing_suggested_type, existing_context
                )

                if is_identical:
                    # True duplicate - just increment report count
                    await db.execute(
                        """
                        UPDATE missing_content_feedback
                        SET report_count = ?,
                            last_reported_at = ?
                        WHERE id = ?
                        """,
                        (current_count + 1, current_time, existing_id),
                    )
                    feedback.id = existing_id
                    await db.commit()
                    return "duplicate"
                else:
                    # Update - increment count and update fields
                    await db.execute(
                        """
                        UPDATE missing_content_feedback
                        SET report_count = ?,
                            last_reported_at = ?,
                            context = ?,
                            suggested_type = ?,
                            model_provider = ?,
                            model_name = ?
                        WHERE id = ?
                        """,
                        (
                            current_count + 1,
                            current_time,
                            feedback.context,
                            feedback.suggestedType,
                            feedback.modelProvider,  # NEW
                            feedback.modelName,  # NEW
                            existing_id,
                        ),
                    )
                    feedback.id = existing_id
                    await db.commit()
                    return "updated"
            else:
                # This shouldn't happen, but fallback to update behavior
                await db.execute(
                    """
                    UPDATE missing_content_feedback
                    SET report_count = ?,
                        last_reported_at = ?,
                        context = ?,
                        suggested_type = ?,
                        model_provider = ?,
                        model_name = ?
                    WHERE id = ?
                    """,
                    (
                        current_count + 1,
                        current_time,
                        feedback.context,
                        feedback.suggestedType,
                        feedback.modelProvider,  # NEW
                        feedback.modelName,  # NEW
                        existing_id,
                    ),
                )
                feedback.id = existing_id
                await db.commit()
                return "updated"

        else:
            # No existing record found - insert new record
            await db.execute(
                """
                INSERT INTO missing_content_feedback (
                    id, content, suggested_type, client_timestamp, url, context,
                    created_at, report_count, first_reported_at, last_reported_at,
                    model_provider, model_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    feedback.modelProvider,  # NEW
                    feedback.modelName,  # NEW
                ),
            )
            await db.commit()
            return "new"

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
            nugget_content = example[0]  # nugget_content
            start_content = extract_first_words(nugget_content)
            end_content = extract_last_words(nugget_content)
            
            # Skip examples with invalid content markers
            if not validate_content_markers(start_content, end_content):
                continue
                
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": [
                            {
                                "type": example[5],  # final_type
                                "startContent": start_content,
                                "endContent": end_content,
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
            missing_content = example[0]  # content
            start_content = extract_first_words(missing_content)
            end_content = extract_last_words(missing_content)
            
            # Skip examples with invalid content markers
            if not validate_content_markers(start_content, end_content):
                continue
                
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": [
                            {
                                "type": example[1],  # suggested_type
                                "startContent": start_content,
                                "endContent": end_content,
                            }
                        ]
                    },
                    "feedback_score": 0.8,  # High quality but manually identified
                    "url": example[2],
                    "timestamp": example[4],
                }
            )

        return training_examples

    async def get_training_examples_for_prompt(
        self,
        db: aiosqlite.Connection,
        prompt_id: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict]:
        """
        Generate training examples for DSPy optimization from feedback data specific to a Chrome extension prompt.

        This method enables prompt-specific optimization by filtering feedback that was generated
        using a specific Chrome extension prompt, provider, and model combination.
        """
        training_examples = []

        # Build query conditions
        prompt_conditions = ["nf.prompt_id = ?"]
        params = [prompt_id]

        if provider:
            prompt_conditions.append("nf.model_provider = ?")
            params.append(provider)

        if model:
            prompt_conditions.append("nf.model_name = ?")
            params.append(model)

        prompt_where_clause = " AND ".join(prompt_conditions)

        # Get positive nugget examples for this specific prompt
        cursor = await db.execute(
            f"""
            SELECT nf.nugget_content, nf.original_type, nf.url, nf.context, nf.created_at,
                   CASE WHEN nf.corrected_type IS NOT NULL THEN nf.corrected_type ELSE nf.original_type END as final_type,
                   nf.prompt_id, nf.model_provider, nf.model_name, nf.full_prompt_content
            FROM nugget_feedback nf
            WHERE nf.rating = 'positive' AND {prompt_where_clause}
            ORDER BY nf.created_at DESC
            LIMIT ?
            """,
            (*params, limit // 2),
        )

        positive_examples = await cursor.fetchall()

        for example in positive_examples:
            nugget_content = example[0]  # nugget_content
            start_content = extract_first_words(nugget_content)
            end_content = extract_last_words(nugget_content)
            
            # Skip examples with invalid content markers
            if not validate_content_markers(start_content, end_content):
                continue
                
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": [
                            {
                                "type": example[5],  # final_type
                                "startContent": start_content,
                                "endContent": end_content,
                            }
                        ]
                    },
                    "feedback_score": 1.0,  # Positive feedback
                    "url": example[2],
                    "timestamp": example[4],
                    # Chrome extension prompt context
                    "prompt_id": example[6],
                    "model_provider": example[7],
                    "model_name": example[8],
                    "full_prompt_content": example[9],
                }
            )

        # Get negative nugget examples for this specific prompt (what NOT to extract)
        cursor = await db.execute(
            f"""
            SELECT nf.nugget_content, nf.original_type, nf.url, nf.context, nf.created_at,
                   CASE WHEN nf.corrected_type IS NOT NULL THEN nf.corrected_type ELSE nf.original_type END as final_type,
                   nf.prompt_id, nf.model_provider, nf.model_name, nf.full_prompt_content
            FROM nugget_feedback nf
            WHERE nf.rating = 'negative' AND {prompt_where_clause}
            ORDER BY nf.created_at DESC
            LIMIT ?
            """,
            (*params, limit // 4),
        )

        negative_examples = await cursor.fetchall()

        for example in negative_examples:
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": []
                    },  # Empty - should not extract
                    "feedback_score": 0.0,  # Negative feedback
                    "url": example[2],
                    "timestamp": example[4],
                    # Chrome extension prompt context
                    "prompt_id": example[6],
                    "model_provider": example[7],
                    "model_name": example[8],
                    "full_prompt_content": example[9],
                }
            )

        # Get missing content examples for this specific prompt (what SHOULD have been extracted)
        cursor = await db.execute(
            f"""
            SELECT mcf.content, mcf.suggested_type, mcf.url, mcf.context, mcf.created_at,
                   mcf.prompt_id, mcf.model_provider, mcf.model_name, mcf.full_prompt_content
            FROM missing_content_feedback mcf
            WHERE {prompt_where_clause}
            ORDER BY mcf.created_at DESC
            LIMIT ?
            """,
            (*params, limit // 4),
        )

        missing_examples = await cursor.fetchall()

        for example in missing_examples:
            missing_content = example[0]  # content
            start_content = extract_first_words(missing_content)
            end_content = extract_last_words(missing_content)
            
            # Skip examples with invalid content markers
            if not validate_content_markers(start_content, end_content):
                continue
                
            training_examples.append(
                {
                    "id": str(uuid.uuid4()),
                    "input_content": example[3],  # context
                    "expected_output": {
                        "golden_nuggets": [
                            {
                                "type": example[1],  # suggested_type
                                "startContent": start_content,
                                "endContent": end_content,
                            }
                        ]
                    },
                    "feedback_score": 0.8,  # High quality - user identified as valuable
                    "url": example[2],
                    "timestamp": example[4],
                    # Chrome extension prompt context
                    "prompt_id": example[5],
                    "model_provider": example[6],
                    "model_name": example[7],
                    "full_prompt_content": example[8],
                }
            )

        logger.info(
            f"Generated {len(training_examples)} prompt-specific training examples for {prompt_id}",
            extra={
                "prompt_id": prompt_id,
                "provider": provider,
                "model": model,
                "positive_examples": len(positive_examples),
                "negative_examples": len(negative_examples),
                "missing_examples": len(missing_examples),
                "total_examples": len(training_examples),
            },
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
                    client_timestamp, created_at, model_provider, model_name
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
                        "model_provider": item[12],
                        "model_name": item[13],
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
                    client_timestamp, created_at, model_provider, model_name
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
                        "model_provider": item[10],
                        "model_name": item[11],
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
                    usage_count, client_timestamp, created_at
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
                    client_timestamp, created_at
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
        updates: dict,
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
            valid_fields = ["nugget_content", "rating", "corrected_type", "context"]
            update_fields = []
            update_values = []

            for field, value in updates.items():
                if field == "content":  # Map 'content' to 'nugget_content'
                    field = "nugget_content"
                if field in valid_fields:
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)

            if not update_fields:
                return False

            update_values.append(feedback_id)
            query = f"""
                UPDATE nugget_feedback
                SET {", ".join(update_fields)}
                WHERE id = ?
            """

        else:  # missing_content
            # Build dynamic update query for missing content feedback
            valid_fields = ["content", "suggested_type", "context"]
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
                SET {", ".join(update_fields)}
                WHERE id = ?
            """

        cursor = await db.execute(query, update_values)
        await db.commit()

        return cursor.rowcount > 0

    async def delete_feedback_item(
        self, db: aiosqlite.Connection, feedback_id: str, feedback_type: str
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

    async def delete_feedback_item_auto_detect(
        self, db: aiosqlite.Connection, feedback_id: str
    ) -> bool:
        """
        Delete a feedback item by auto-detecting its type.

        Args:
            db: Database connection
            feedback_id: ID of the feedback item

        Returns:
            True if item was deleted, False if not found
        """
        # Try nugget feedback first
        success = await self.delete_feedback_item(db, feedback_id, "nugget")
        if success:
            return True

        # Try missing content feedback
        success = await self.delete_feedback_item(db, feedback_id, "missing_content")
        return success

    # Legacy methods for backward compatibility with tests
    async def store_training_examples(
        self, db: aiosqlite.Connection, training_examples: list[dict]
    ):
        """
        Store training examples - compatibility method for tests.

        In the new schema, we don't store training examples separately,
        but generate them on-the-fly from feedback data. This method
        converts training examples into feedback records for testing.
        """
        for example in training_examples:
            # Extract relevant data from training example
            content = example.get("input_content", "Test content")
            expected = example.get("expected_output", {})
            feedback_score = example.get("feedback_score", 1.0)

            nuggets = expected.get("golden_nuggets", [])

            if nuggets and feedback_score > 0.5:
                # Convert to positive nugget feedback
                for nugget in nuggets:
                    await db.execute(
                        """
                        INSERT INTO nugget_feedback (
                            id, nugget_content, original_type, rating,
                            url, context, client_timestamp, created_at,
                            report_count, first_reported_at, last_reported_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            str(uuid.uuid4()),
                            nugget.get("content", "Test nugget"),
                            nugget.get("type", "tool"),
                            "positive",
                            example.get("url", "https://example.com/test"),
                            content,
                            datetime.now(timezone.utc).timestamp() * 1000,
                            datetime.now(timezone.utc),
                            1,
                            datetime.now(timezone.utc),
                            datetime.now(timezone.utc),
                        ),
                    )
            elif feedback_score <= 0.5:
                # Convert to negative feedback or missing content
                await db.execute(
                    """
                    INSERT INTO missing_content_feedback (
                        id, content, suggested_type, url, context,
                        client_timestamp, created_at, report_count,
                        first_reported_at, last_reported_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        content[:100],  # Truncate for missing content
                        "aha! moments",
                        example.get("url", "https://example.com/test"),
                        content,
                        datetime.now(timezone.utc).timestamp() * 1000,
                        datetime.now(timezone.utc),
                        1,
                        datetime.now(timezone.utc),
                        datetime.now(timezone.utc),
                    ),
                )

        await db.commit()

    async def get_stored_training_examples(
        self, db: aiosqlite.Connection, limit: int = 100
    ) -> list[dict]:
        """
        Get stored training examples - compatibility method for tests.

        In the new schema, this calls get_training_examples which generates
        training examples on-the-fly from feedback data.
        """
        return await self.get_training_examples(db, limit)

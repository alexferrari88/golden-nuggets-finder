"""
Improved cost tracking service using DSPy's built-in cost tracking.

This replaces manual cost calculations with DSPy's automatic cost tracking
via lm.history, providing accurate, maintenance-free cost monitoring.
"""

from datetime import datetime, timedelta, timezone
import json
from typing import Optional
import uuid

import aiosqlite


class ImprovedCostTrackingService:
    """Service for tracking optimization costs using DSPy's built-in cost tracking"""

    async def track_dspy_operation_cost(
        self,
        db: aiosqlite.Connection,
        lm,  # DSPy language model with history
        optimization_run_id: str,
        operation_type: str,
        operation_name: str = "DSPy Operation",
        metadata: Optional[dict] = None,
    ) -> dict:
        """
        Track the cost of a DSPy operation using built-in cost tracking.

        Args:
            db: Database connection
            lm: DSPy language model with history
            optimization_run_id: ID of the optimization run
            operation_type: Type of operation ('prompt_generation', 'optimization', 'evaluation')
            operation_name: Descriptive name for the operation
            metadata: Additional operation-specific data

        Returns:
            Dictionary with cost tracking details
        """
        # Get accurate costs from DSPy history
        operation_cost = sum([x["cost"] for x in lm.history if x["cost"] is not None])

        # Get token usage details
        total_tokens = sum([x["usage"]["total_tokens"] for x in lm.history])
        input_tokens = sum([x["usage"]["prompt_tokens"] for x in lm.history])
        output_tokens = sum([x["usage"]["completion_tokens"] for x in lm.history])
        api_calls = len(lm.history)

        # Get model information (from first history entry)
        model_name = lm.history[0]["response_model"] if lm.history else "unknown"

        cost_id = str(uuid.uuid4())

        # Store in database for historical tracking
        await db.execute(
            """
            INSERT INTO cost_tracking (
                id, optimization_run_id, operation_type, model_name,
                input_tokens, output_tokens, cost_usd, timestamp, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cost_id,
                optimization_run_id,
                operation_type,
                model_name,
                input_tokens,
                output_tokens,
                operation_cost,
                datetime.now(timezone.utc).isoformat(),
                json.dumps(
                    {
                        **(metadata or {}),
                        "operation_name": operation_name,
                        "api_calls": api_calls,
                        "total_tokens": total_tokens,
                        "cost_source": "dspy_builtin",
                        "accurate": True,
                    }
                ),
            ),
        )
        await db.commit()

        # Update the optimization run's total costs
        await self._update_run_totals(db, optimization_run_id)

        # Create detailed breakdown for caller
        cost_breakdown = {
            "cost_id": cost_id,
            "operation_cost": operation_cost,
            "total_tokens": total_tokens,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "api_calls": api_calls,
            "model_name": model_name,
            "cost_per_token": operation_cost / max(total_tokens, 1),
            "cost_per_call": operation_cost / max(api_calls, 1),
            "history_entries": len(lm.history),
        }

        # Clear history to prepare for next operation
        lm.history.clear()

        return cost_breakdown

    async def get_run_costs(
        self, db: aiosqlite.Connection, optimization_run_id: str
    ) -> dict:
        """
        Get detailed cost breakdown for an optimization run.
        (Reuses the existing method but notes data source accuracy)
        """
        # Get total costs from optimization_runs table
        cursor = await db.execute(
            """
            SELECT api_cost, total_tokens, input_tokens, output_tokens
            FROM optimization_runs
            WHERE id = ?
            """,
            (optimization_run_id,),
        )

        run_totals = await cursor.fetchone()

        # Get detailed cost breakdown with source information
        cursor = await db.execute(
            """
            SELECT operation_type, model_name, input_tokens, 
                   output_tokens, cost_usd, timestamp, metadata
            FROM cost_tracking
            WHERE optimization_run_id = ?
            ORDER BY timestamp ASC
            """,
            (optimization_run_id,),
        )

        detailed_costs = await cursor.fetchall()

        # Group costs by operation type and analyze accuracy
        costs_by_operation = {}
        costs_by_model = {}
        accurate_entries = 0

        for row in detailed_costs:
            (
                operation_type,
                model_name,
                input_tokens,
                output_tokens,
                cost_usd,
                timestamp,
                metadata_str,
            ) = row

            # Parse metadata to check if this is from DSPy builtin
            metadata = json.loads(metadata_str) if metadata_str else {}
            is_accurate = metadata.get("accurate", False)
            if is_accurate:
                accurate_entries += 1

            # Group by operation
            if operation_type not in costs_by_operation:
                costs_by_operation[operation_type] = {
                    "total_cost": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "call_count": 0,
                    "accurate_entries": 0,
                }

            costs_by_operation[operation_type]["total_cost"] += cost_usd
            costs_by_operation[operation_type]["input_tokens"] += input_tokens
            costs_by_operation[operation_type]["output_tokens"] += output_tokens
            costs_by_operation[operation_type]["call_count"] += 1
            if is_accurate:
                costs_by_operation[operation_type]["accurate_entries"] += 1

            # Group by model
            if model_name not in costs_by_model:
                costs_by_model[model_name] = {
                    "total_cost": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "call_count": 0,
                }

            costs_by_model[model_name]["total_cost"] += cost_usd
            costs_by_model[model_name]["input_tokens"] += input_tokens
            costs_by_model[model_name]["output_tokens"] += output_tokens
            costs_by_model[model_name]["call_count"] += 1

        return {
            "run_id": optimization_run_id,
            "total_cost": run_totals[0] if run_totals else 0,
            "total_tokens": run_totals[1] if run_totals else 0,
            "input_tokens": run_totals[2] if run_totals else 0,
            "output_tokens": run_totals[3] if run_totals else 0,
            "costs_by_operation": costs_by_operation,
            "costs_by_model": costs_by_model,
            "detailed_entries": len(detailed_costs),
            "cost_accuracy": {
                "total_entries": len(detailed_costs),
                "accurate_entries": accurate_entries,
                "accuracy_percentage": (accurate_entries / len(detailed_costs) * 100)
                if detailed_costs
                else 0,
                "method": "dspy_builtin"
                if accurate_entries > 0
                else "manual_calculation",
            },
        }

    async def get_costs_summary(self, db: aiosqlite.Connection, days: int = 30) -> dict:
        """
        Get cost summary with accuracy information.
        (Enhanced version of existing method)
        """
        since_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        # Get total costs for the period
        cursor = await db.execute(
            """
            SELECT 
                COALESCE(SUM(api_cost), 0) as total_cost,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COUNT(*) as total_runs
            FROM optimization_runs
            WHERE started_at > ?
            """,
            (since_date,),
        )

        period_totals = await cursor.fetchone()

        # Get daily breakdown
        cursor = await db.execute(
            """
            SELECT 
                DATE(started_at) as date,
                SUM(api_cost) as daily_cost,
                SUM(total_tokens) as daily_tokens,
                COUNT(*) as daily_runs
            FROM optimization_runs
            WHERE started_at > ?
            GROUP BY DATE(started_at)
            ORDER BY date ASC
            """,
            (since_date,),
        )

        daily_breakdown = await cursor.fetchall()

        # Get cost accuracy statistics
        cursor = await db.execute(
            """
            SELECT 
                COUNT(*) as total_entries,
                SUM(CASE WHEN json_extract(metadata, '$.accurate') = 'true' THEN 1 ELSE 0 END) as accurate_entries
            FROM cost_tracking ct
            JOIN optimization_runs or_main ON ct.optimization_run_id = or_main.id
            WHERE or_main.started_at > ?
            """,
            (since_date,),
        )

        accuracy_stats = await cursor.fetchone()

        return {
            "period_days": days,
            "total_cost": period_totals[0],
            "total_tokens": period_totals[1],
            "total_runs": period_totals[2],
            "average_cost_per_run": period_totals[0] / max(period_totals[2], 1),
            "daily_breakdown": [
                {"date": row[0], "cost": row[1], "tokens": row[2], "runs": row[3]}
                for row in daily_breakdown
            ],
            "cost_tracking_accuracy": {
                "total_cost_entries": accuracy_stats[0] if accuracy_stats else 0,
                "accurate_entries": accuracy_stats[1] if accuracy_stats else 0,
                "accuracy_percentage": (accuracy_stats[1] / accuracy_stats[0] * 100)
                if accuracy_stats and accuracy_stats[0] > 0
                else 0,
                "method": "DSPy built-in cost tracking (recommended)",
            },
        }

    async def _update_run_totals(
        self, db: aiosqlite.Connection, optimization_run_id: str
    ):
        """
        Update the total costs in the optimization_runs table.
        (Same as existing method)
        """
        # Calculate totals from cost_tracking entries
        cursor = await db.execute(
            """
            SELECT 
                SUM(cost_usd) as total_cost,
                SUM(input_tokens + output_tokens) as total_tokens,
                SUM(input_tokens) as total_input_tokens,
                SUM(output_tokens) as total_output_tokens
            FROM cost_tracking
            WHERE optimization_run_id = ?
            """,
            (optimization_run_id,),
        )

        totals = await cursor.fetchone()

        if totals and totals[0] is not None:  # If there are cost entries
            await db.execute(
                """
                UPDATE optimization_runs
                SET api_cost = ?, total_tokens = ?, input_tokens = ?, output_tokens = ?
                WHERE id = ?
                """,
                (totals[0], totals[1], totals[2], totals[3], optimization_run_id),
            )
            await db.commit()

    # Utility methods for migration and testing

    async def migrate_to_accurate_tracking(
        self, db: aiosqlite.Connection, optimization_run_id: str
    ):
        """
        Mark existing cost entries as using manual calculation method.
        This helps distinguish between old manual calculations and new accurate DSPy costs.
        """
        await db.execute(
            """
            UPDATE cost_tracking 
            SET metadata = json_set(
                COALESCE(metadata, '{}'), 
                '$.accurate', 'false',
                '$.cost_source', 'manual_calculation',
                '$.migration_note', 'Pre-DSPy builtin tracking'
            )
            WHERE optimization_run_id = ? 
            AND (json_extract(metadata, '$.accurate') IS NULL)
            """,
            (optimization_run_id,),
        )
        await db.commit()

    def get_cost_from_dspy_history(self, lm) -> dict:
        """
        Extract cost information from DSPy language model history without storing to database.
        Useful for real-time cost monitoring during operations.

        Returns:
            Dictionary with cost breakdown
        """
        if not lm.history:
            return {
                "total_cost": 0.0,
                "total_tokens": 0,
                "api_calls": 0,
                "cost_per_call": 0.0,
                "cost_per_token": 0.0,
            }

        total_cost = sum([x["cost"] for x in lm.history if x["cost"] is not None])
        total_tokens = sum([x["usage"]["total_tokens"] for x in lm.history])
        api_calls = len(lm.history)

        return {
            "total_cost": total_cost,
            "total_tokens": total_tokens,
            "input_tokens": sum([x["usage"]["prompt_tokens"] for x in lm.history]),
            "output_tokens": sum([x["usage"]["completion_tokens"] for x in lm.history]),
            "api_calls": api_calls,
            "cost_per_call": total_cost / max(api_calls, 1),
            "cost_per_token": total_cost / max(total_tokens, 1),
            "model": lm.history[0]["response_model"] if lm.history else "unknown",
            "accurate": True,
            "method": "dspy_builtin",
        }

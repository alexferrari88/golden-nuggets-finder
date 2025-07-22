"""
Cost tracking service for monitoring API usage and costs during DSPy optimizations.

Tracks detailed cost information including token usage, API calls,
and cost breakdowns by operation type and model.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import aiosqlite


class CostTrackingService:
    """Service for tracking optimization costs and token usage"""
    
    # Cost per token for different models (in USD)
    # These should be updated based on current API pricing
    TOKEN_COSTS = {
        "gpt-4o": {"input": 0.0000025, "output": 0.00001},  # $2.50/$10 per 1M tokens
        "gpt-4o-mini": {"input": 0.00000015, "output": 0.0000006},  # $0.15/$0.60 per 1M tokens
        "gemini-2.5-flash": {"input": 0.00000075, "output": 0.000003},  # $0.075/$0.30 per 1M tokens
        "gemini-1.5-pro": {"input": 0.00000125, "output": 0.000005},  # $1.25/$5 per 1M tokens
    }
    
    async def track_operation_cost(
        self,
        db: aiosqlite.Connection,
        optimization_run_id: str,
        operation_type: str,
        model_name: str,
        input_tokens: int,
        output_tokens: int,
        metadata: Optional[dict] = None
    ) -> str:
        """
        Track the cost of a specific operation during optimization.
        
        Args:
            db: Database connection
            optimization_run_id: ID of the optimization run
            operation_type: Type of operation ('prompt_generation', 'optimization', 'evaluation', 'api_call')
            model_name: Name of the model used
            input_tokens: Number of input tokens used
            output_tokens: Number of output tokens generated
            metadata: Additional operation-specific data
            
        Returns:
            Cost tracking entry ID
        """
        # Calculate cost based on model pricing
        cost_usd = self._calculate_cost(model_name, input_tokens, output_tokens)
        
        cost_id = str(uuid.uuid4())
        
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
                cost_usd,
                datetime.now().isoformat(),
                json.dumps(metadata) if metadata else None
            )
        )
        await db.commit()
        
        # Update the optimization run's total costs
        await self._update_run_totals(db, optimization_run_id)
        
        return cost_id
    
    async def get_run_costs(
        self, 
        db: aiosqlite.Connection, 
        optimization_run_id: str
    ) -> dict:
        """
        Get detailed cost breakdown for an optimization run.
        
        Args:
            db: Database connection
            optimization_run_id: Optimization run ID
            
        Returns:
            Dictionary with cost breakdown and totals
        """
        # Get total costs from optimization_runs table
        cursor = await db.execute(
            """
            SELECT api_cost, tokens_used, input_tokens, output_tokens
            FROM optimization_runs
            WHERE id = ?
            """,
            (optimization_run_id,)
        )
        
        run_totals = await cursor.fetchone()
        
        # Get detailed cost breakdown
        cursor = await db.execute(
            """
            SELECT operation_type, model_name, input_tokens, 
                   output_tokens, cost_usd, timestamp, metadata
            FROM cost_tracking
            WHERE optimization_run_id = ?
            ORDER BY timestamp ASC
            """,
            (optimization_run_id,)
        )
        
        detailed_costs = await cursor.fetchall()
        
        # Group costs by operation type
        costs_by_operation = {}
        costs_by_model = {}
        
        for row in detailed_costs:
            operation_type, model_name, input_tokens, output_tokens, cost_usd, timestamp, metadata = row
            
            # Group by operation
            if operation_type not in costs_by_operation:
                costs_by_operation[operation_type] = {
                    "total_cost": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "call_count": 0
                }
            
            costs_by_operation[operation_type]["total_cost"] += cost_usd
            costs_by_operation[operation_type]["input_tokens"] += input_tokens
            costs_by_operation[operation_type]["output_tokens"] += output_tokens
            costs_by_operation[operation_type]["call_count"] += 1
            
            # Group by model
            if model_name not in costs_by_model:
                costs_by_model[model_name] = {
                    "total_cost": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "call_count": 0
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
            "detailed_entries": len(detailed_costs)
        }
    
    async def get_costs_summary(
        self, 
        db: aiosqlite.Connection, 
        days: int = 30
    ) -> dict:
        """
        Get cost summary over a specified time period.
        
        Args:
            db: Database connection
            days: Number of days to look back
            
        Returns:
            Cost summary with trends and breakdowns
        """
        since_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get total costs for the period
        cursor = await db.execute(
            """
            SELECT 
                COALESCE(SUM(api_cost), 0) as total_cost,
                COALESCE(SUM(tokens_used), 0) as total_tokens,
                COUNT(*) as total_runs
            FROM optimization_runs
            WHERE started_at > ?
            """,
            (since_date,)
        )
        
        period_totals = await cursor.fetchone()
        
        # Get daily breakdown
        cursor = await db.execute(
            """
            SELECT 
                DATE(started_at) as date,
                SUM(api_cost) as daily_cost,
                SUM(tokens_used) as daily_tokens,
                COUNT(*) as daily_runs
            FROM optimization_runs
            WHERE started_at > ?
            GROUP BY DATE(started_at)
            ORDER BY date ASC
            """,
            (since_date,)
        )
        
        daily_breakdown = await cursor.fetchall()
        
        # Get costs by mode
        cursor = await db.execute(
            """
            SELECT 
                mode,
                COALESCE(SUM(api_cost), 0) as mode_cost,
                COALESCE(SUM(tokens_used), 0) as mode_tokens,
                COUNT(*) as mode_runs
            FROM optimization_runs
            WHERE started_at > ?
            GROUP BY mode
            """,
            (since_date,)
        )
        
        costs_by_mode = await cursor.fetchall()
        
        # Get model usage from cost_tracking
        cursor = await db.execute(
            """
            SELECT 
                ct.model_name,
                SUM(ct.cost_usd) as model_cost,
                SUM(ct.input_tokens + ct.output_tokens) as model_tokens,
                COUNT(*) as call_count
            FROM cost_tracking ct
            JOIN optimization_runs or_main ON ct.optimization_run_id = or_main.id
            WHERE or_main.started_at > ?
            GROUP BY ct.model_name
            """,
            (since_date,)
        )
        
        model_usage = await cursor.fetchall()
        
        return {
            "period_days": days,
            "total_cost": period_totals[0],
            "total_tokens": period_totals[1],
            "total_runs": period_totals[2],
            "average_cost_per_run": period_totals[0] / max(period_totals[2], 1),
            "daily_breakdown": [
                {
                    "date": row[0],
                    "cost": row[1],
                    "tokens": row[2],
                    "runs": row[3]
                }
                for row in daily_breakdown
            ],
            "costs_by_mode": {
                row[0]: {
                    "cost": row[1],
                    "tokens": row[2],
                    "runs": row[3]
                }
                for row in costs_by_mode
            },
            "model_usage": {
                row[0]: {
                    "cost": row[1],
                    "tokens": row[2],
                    "calls": row[3]
                }
                for row in model_usage
            }
        }
    
    async def get_cost_trends(
        self, 
        db: aiosqlite.Connection, 
        days: int = 30
    ) -> dict:
        """
        Get cost trends and projections.
        
        Args:
            db: Database connection
            days: Number of days for trend analysis
            
        Returns:
            Trend data and projections
        """
        since_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get weekly costs for trend analysis
        cursor = await db.execute(
            """
            SELECT 
                strftime('%Y-%W', started_at) as week,
                SUM(api_cost) as weekly_cost,
                COUNT(*) as weekly_runs
            FROM optimization_runs
            WHERE started_at > ?
            GROUP BY strftime('%Y-%W', started_at)
            ORDER BY week ASC
            """,
            (since_date,)
        )
        
        weekly_data = await cursor.fetchall()
        
        # Calculate trends
        costs = [row[1] for row in weekly_data]
        runs = [row[2] for row in weekly_data]
        
        # Simple trend calculation (could be enhanced with proper regression)
        if len(costs) >= 2:
            recent_avg = sum(costs[-2:]) / 2 if len(costs) >= 2 else costs[-1]
            earlier_avg = sum(costs[:2]) / 2 if len(costs) >= 2 else costs[0]
            cost_trend = "increasing" if recent_avg > earlier_avg else "decreasing"
        else:
            cost_trend = "stable"
        
        return {
            "trend_period_days": days,
            "cost_trend": cost_trend,
            "weekly_data": [
                {
                    "week": row[0],
                    "cost": row[1],
                    "runs": row[2]
                }
                for row in weekly_data
            ],
            "average_weekly_cost": sum(costs) / len(costs) if costs else 0,
            "average_weekly_runs": sum(runs) / len(runs) if runs else 0
        }
    
    def _calculate_cost(self, model_name: str, input_tokens: int, output_tokens: int) -> float:
        """
        Calculate the cost for a model operation based on token usage.
        
        Args:
            model_name: Name of the model
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            
        Returns:
            Cost in USD
        """
        if model_name not in self.TOKEN_COSTS:
            # Default cost if model not found
            input_cost = input_tokens * 0.000001  # $1 per 1M tokens
            output_cost = output_tokens * 0.000001
        else:
            costs = self.TOKEN_COSTS[model_name]
            input_cost = input_tokens * costs["input"]
            output_cost = output_tokens * costs["output"]
        
        return input_cost + output_cost
    
    async def _update_run_totals(self, db: aiosqlite.Connection, optimization_run_id: str):
        """
        Update the total costs in the optimization_runs table.
        
        Args:
            db: Database connection
            optimization_run_id: Optimization run ID
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
            (optimization_run_id,)
        )
        
        totals = await cursor.fetchone()
        
        if totals and totals[0] is not None:  # If there are cost entries
            await db.execute(
                """
                UPDATE optimization_runs
                SET api_cost = ?, tokens_used = ?, input_tokens = ?, output_tokens = ?
                WHERE id = ?
                """,
                (totals[0], totals[1], totals[2], totals[3], optimization_run_id)
            )
            await db.commit()
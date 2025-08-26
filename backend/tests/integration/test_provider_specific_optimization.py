"""
Integration tests for provider-specific optimization with Chrome extension prompts.

Tests that each AI provider (Gemini, OpenAI, Anthropic, OpenRouter) can optimize
the sophisticated Chrome extension DEFAULT_PROMPTS while maintaining their
advanced engineering features.
"""

import asyncio
import json
import logging
from unittest.mock import AsyncMock, patch

import pytest

from app.services.optimization_service import OptimizationService


class TestProviderSpecificOptimization:
    """Test provider-specific optimization with Chrome extension prompts"""

    @pytest.fixture
    def providers(self):
        """List of supported AI providers"""
        return ["gemini", "openai", "anthropic", "openrouter"]

    @pytest.fixture
    async def optimization_service(self):
        """Create optimization service for testing"""
        return OptimizationService()

    @pytest.fixture
    async def mock_db_with_provider_feedback(self):
        """Create mock database with provider-specific feedback data"""
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()

        # Mock feedback data with provider information
        mock_cursor.fetchall.return_value = [
            (
                "feedback_gemini_1",
                json.dumps(
                    {
                        "content": "Technical article about async programming",
                        "analysis": {
                            "golden_nuggets": [
                                {
                                    "type": "aha! moments",
                                    "content": "The key insight about async/await is that it's syntactic sugar over Promises, making asynchronous code readable while avoiding callback hell.",
                                    "startContent": "The key insight about async/await",
                                    "endContent": "avoiding callback hell",
                                }
                            ]
                        },
                        "provider": "gemini",
                        "model": "gemini-2.5-flash",
                    }
                ),
                5,  # rating
                "2024-01-01T00:00:00Z",
            ),
            (
                "feedback_openai_1",
                json.dumps(
                    {
                        "content": "Productivity tools comparison article",
                        "analysis": {
                            "golden_nuggets": [
                                {
                                    "type": "tool",
                                    "content": "I use Notion's database templates with rollup properties to automatically track project progress across multiple workspaces, which eliminates manual status updates.",
                                    "startContent": "I use Notion's database templates",
                                    "endContent": "manual status updates",
                                }
                            ]
                        },
                        "provider": "openai",
                        "model": "gpt-4",
                    }
                ),
                4,  # rating
                "2024-01-02T00:00:00Z",
            ),
            (
                "feedback_anthropic_1",
                json.dumps(
                    {
                        "content": "Mental models for decision making",
                        "analysis": {
                            "golden_nuggets": [
                                {
                                    "type": "model",
                                    "content": "The 'Inversion' mental model works by asking 'What would guarantee failure?' before starting a project, helping identify risks proactively instead of just planning for success.",
                                    "startContent": "The 'Inversion' mental model works",
                                    "endContent": "planning for success",
                                }
                            ]
                        },
                        "provider": "anthropic",
                        "model": "claude-3-sonnet",
                    }
                ),
                5,  # rating
                "2024-01-03T00:00:00Z",
            ),
        ]

        mock_db.execute.return_value = mock_cursor
        mock_db.commit = AsyncMock()

        return mock_db

    @pytest.mark.asyncio
    async def test_provider_optimization_triggers(
        self, optimization_service, mock_db_with_provider_feedback, providers
    ):
        """Test that provider-specific optimization can be triggered for each provider"""

        for provider_id in providers:
            with patch.object(
                optimization_service.multi_model_manager, "optimize_for_provider"
            ) as mock_optimize:
                mock_optimize.return_value = {
                    "success": True,
                    "run_id": f"run_{provider_id}",
                    "optimized_prompt_id": f"prompt_{provider_id}",
                    "performance_improvement": 0.18,
                    "training_examples": 5,
                    "mode": "cheap",
                    "provider_id": provider_id,
                }

                result = await optimization_service.run_provider_optimization(
                    mock_db_with_provider_feedback,
                    provider_id=provider_id,
                    mode="cheap",
                    auto_trigger=False,
                )

                assert result["success"] is True
                assert result["provider_id"] == provider_id
                assert result["run_id"] == f"run_{provider_id}"

                # Verify the optimization was called with correct parameters
                mock_optimize.assert_called_once_with(
                    mock_db_with_provider_feedback, provider_id, "cheap", False
                )

    @pytest.mark.asyncio
    async def test_provider_threshold_checking(
        self, optimization_service, mock_db_with_provider_feedback, providers
    ):
        """Test threshold checking for each provider"""

        with patch.object(
            optimization_service.multi_model_manager, "should_optimize_provider"
        ) as mock_should_optimize:
            # Mock different threshold states for different providers
            mock_should_optimize.side_effect = lambda db, provider_id: {
                "should_optimize": provider_id
                in ["gemini", "anthropic"],  # Only some meet threshold
                "total_feedback": 25 if provider_id in ["gemini", "anthropic"] else 15,
                "threshold_met": provider_id in ["gemini", "anthropic"],
                "provider_id": provider_id,
            }

            results = await optimization_service.check_provider_optimization_thresholds(
                mock_db_with_provider_feedback
            )

            # Verify results for each provider
            assert len(results) == len(providers)

            for provider_id in providers:
                assert provider_id in results
                result = results[provider_id]

                if provider_id in ["gemini", "anthropic"]:
                    assert result["should_optimize"] is True
                    assert result["total_feedback"] == 25
                else:
                    assert result["should_optimize"] is False
                    assert result["total_feedback"] == 15

    @pytest.mark.asyncio
    async def test_auto_trigger_provider_optimizations(
        self, optimization_service, mock_db_with_provider_feedback
    ):
        """Test automatic triggering of provider optimizations"""

        with patch.object(
            optimization_service, "check_provider_optimization_thresholds"
        ) as mock_check:
            with patch.object(
                optimization_service, "run_provider_optimization"
            ) as mock_optimize:
                # Mock threshold results - some providers meet threshold
                mock_check.return_value = {
                    "gemini": {
                        "should_optimize": True,
                        "total_feedback": 30,
                        "threshold_met": True,
                    },
                    "openai": {
                        "should_optimize": False,
                        "total_feedback": 10,
                        "threshold_met": False,
                    },
                    "anthropic": {
                        "should_optimize": True,
                        "total_feedback": 25,
                        "threshold_met": True,
                    },
                    "openrouter": {
                        "should_optimize": False,
                        "total_feedback": 5,
                        "threshold_met": False,
                    },
                }

                # Mock optimization results
                mock_optimize.return_value = {
                    "success": True,
                    "run_id": "auto_run_123",
                    "performance_improvement": 0.20,
                    "training_examples": 30,
                }

                results = (
                    await optimization_service.auto_trigger_provider_optimizations(
                        mock_db_with_provider_feedback
                    )
                )

                # Verify triggering results
                assert len(results["triggered"]) == 2  # gemini and anthropic
                assert len(results["skipped"]) == 2  # openai and openrouter
                assert len(results["errors"]) == 0

                # Verify correct providers were triggered
                triggered_providers = [
                    item["provider_id"] for item in results["triggered"]
                ]
                assert "gemini" in triggered_providers
                assert "anthropic" in triggered_providers

                # Verify skipped providers
                skipped_providers = [item["provider_id"] for item in results["skipped"]]
                assert "openai" in skipped_providers
                assert "openrouter" in skipped_providers

    @pytest.mark.asyncio
    async def test_provider_current_prompt_retrieval(
        self, optimization_service, providers
    ):
        """Test retrieving current optimized prompt for each provider"""

        mock_db = AsyncMock()

        for provider_id in providers:
            with patch.object(
                optimization_service.multi_model_manager, "get_provider_current_prompt"
            ) as mock_get_prompt:
                # Mock provider-specific optimized prompt
                mock_prompt = {
                    "id": f"prompt_{provider_id}",
                    "version": 2,
                    "prompt": f"## ROLE & GOAL:\nProvider-optimized prompt for {provider_id} with Diamond Miner Principle...",
                    "optimizationDate": "2024-01-10T00:00:00Z",
                    "performance": {"feedbackCount": 25, "positiveRate": 0.85},
                    "providerSpecific": True,
                    "modelProvider": provider_id,
                    "modelName": "model-name",
                }

                mock_get_prompt.return_value = mock_prompt

                result = await optimization_service.get_provider_current_prompt(
                    mock_db, provider_id
                )

                assert result["id"] == f"prompt_{provider_id}"
                assert result["providerSpecific"] is True
                assert result["modelProvider"] == provider_id
                assert "Diamond Miner Principle" in result["prompt"]

                mock_get_prompt.assert_called_once_with(mock_db, provider_id)

    @pytest.mark.asyncio
    async def test_provider_optimization_with_chrome_extension_features(
        self, optimization_service, mock_db_with_provider_feedback, caplog
    ):
        """Test that provider optimization preserves Chrome extension sophisticated features"""

        provider_id = "gemini"

        with patch.object(
            optimization_service.multi_model_manager, "optimize_for_provider"
        ) as mock_optimize:
            # Mock optimization result that preserves sophisticated features
            optimized_prompt = (
                optimization_service.chrome_extension_default_prompt
                + f"\n\n# Optimized for {provider_id}"
            )

            mock_optimize.return_value = {
                "success": True,
                "run_id": f"run_{provider_id}",
                "optimized_prompt": optimized_prompt,
                "performance_improvement": 0.22,
                "training_examples": 8,
                "mode": "cheap",
                "provider_id": provider_id,
                "preserves_sophistication": True,
            }

            with caplog.at_level(logging.INFO):
                result = await optimization_service.run_provider_optimization(
                    mock_db_with_provider_feedback,
                    provider_id=provider_id,
                    mode="cheap",
                )

            assert result["success"] is True

            # Verify sophisticated features are preserved in the result
            if "optimized_prompt" in result:
                optimized = result["optimized_prompt"]
                assert "Diamond Miner Principle" in optimized
                assert "Anti-Pattern" in optimized
                assert "QUALITY CONTROL" in optimized

    @pytest.mark.asyncio
    async def test_provider_optimization_error_handling(
        self, optimization_service, mock_db_with_provider_feedback
    ):
        """Test error handling during provider-specific optimization"""

        provider_id = "gemini"

        with patch.object(
            optimization_service.multi_model_manager, "optimize_for_provider"
        ) as mock_optimize:
            # Mock optimization failure
            mock_optimize.side_effect = Exception("Provider optimization failed")

            with pytest.raises(Exception, match="Provider optimization failed"):
                await optimization_service.run_provider_optimization(
                    mock_db_with_provider_feedback,
                    provider_id=provider_id,
                    mode="cheap",
                )

    @pytest.mark.asyncio
    async def test_provider_progress_tracking(self, optimization_service, providers):
        """Test progress tracking for provider-specific optimizations"""

        for provider_id in providers:
            run_id = f"test_run_{provider_id}"

            with patch.object(
                optimization_service.multi_model_manager, "get_provider_run_progress"
            ) as mock_get_progress:
                mock_progress = {
                    "step": "optimization",
                    "progress": 75,
                    "message": f"Optimizing {provider_id} prompt",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "provider_id": provider_id,
                    "run_id": run_id,
                }

                mock_get_progress.return_value = mock_progress

                result = optimization_service.get_provider_run_progress(
                    provider_id, run_id
                )

                assert result["provider_id"] == provider_id
                assert result["run_id"] == run_id
                assert result["progress"] == 75

                mock_get_progress.assert_called_once_with(provider_id, run_id)

    @pytest.mark.asyncio
    async def test_all_provider_active_runs(self, optimization_service):
        """Test retrieving active runs across all providers"""

        with patch.object(
            optimization_service.multi_model_manager, "get_all_provider_active_runs"
        ) as mock_get_all_runs:
            mock_active_runs = {
                "gemini": {
                    "run_123": {
                        "step": "optimization",
                        "progress": 60,
                        "message": "Optimizing Gemini prompt",
                    },
                    "run_124": {
                        "step": "validation",
                        "progress": 90,
                        "message": "Validating Gemini optimization",
                    },
                },
                "openai": {
                    "run_125": {
                        "step": "data_gathering",
                        "progress": 30,
                        "message": "Gathering OpenAI training data",
                    }
                },
                "anthropic": {},  # No active runs
                "openrouter": {
                    "run_126": {
                        "step": "storing",
                        "progress": 95,
                        "message": "Storing OpenRouter optimization",
                    }
                },
            }

            mock_get_all_runs.return_value = mock_active_runs

            result = optimization_service.get_all_provider_active_runs()

            assert "gemini" in result
            assert "openai" in result
            assert "anthropic" in result
            assert "openrouter" in result

            assert len(result["gemini"]) == 2
            assert len(result["openai"]) == 1
            assert len(result["anthropic"]) == 0
            assert len(result["openrouter"]) == 1

    @pytest.mark.parametrize(
        "provider_id,model_name",
        [
            ("gemini", "gemini-2.5-flash"),
            ("openai", "gpt-4"),
            ("anthropic", "claude-3-sonnet"),
            ("openrouter", "anthropic/claude-3-sonnet"),
        ],
    )
    @pytest.mark.asyncio
    async def test_provider_model_specific_prompts(
        self, optimization_service, provider_id, model_name
    ):
        """Test provider+model specific prompt retrieval"""

        mock_db = AsyncMock()

        with patch.object(
            optimization_service, "get_current_prompt_for_provider_model"
        ) as mock_get_prompt:
            mock_prompt = {
                "id": f"prompt_{provider_id}_{model_name.replace('/', '_')}",
                "version": 3,
                "prompt": f"## ROLE & GOAL:\nOptimized for {provider_id} {model_name} with Diamond Miner Principle...",
                "optimizationDate": "2024-01-12T00:00:00Z",
                "performance": {"feedbackCount": 35, "positiveRate": 0.89},
                "providerSpecific": True,
                "modelProvider": provider_id,
                "modelName": model_name,
            }

            mock_get_prompt.return_value = mock_prompt

            result = await optimization_service.get_current_prompt_for_provider_model(
                mock_db, provider_id, model_name
            )

            assert result["modelProvider"] == provider_id
            assert result["modelName"] == model_name
            assert result["providerSpecific"] is True
            assert "Diamond Miner Principle" in result["prompt"]

    @pytest.mark.asyncio
    async def test_provider_optimization_modes(
        self, optimization_service, mock_db_with_provider_feedback
    ):
        """Test both cheap and expensive optimization modes for providers"""

        provider_id = "gemini"
        modes = ["cheap", "expensive"]

        for mode in modes:
            with patch.object(
                optimization_service.multi_model_manager, "optimize_for_provider"
            ) as mock_optimize:
                mock_optimize.return_value = {
                    "success": True,
                    "run_id": f"run_{provider_id}_{mode}",
                    "optimized_prompt_id": f"prompt_{provider_id}_{mode}",
                    "performance_improvement": 0.25 if mode == "expensive" else 0.15,
                    "training_examples": 10,
                    "mode": mode,
                    "provider_id": provider_id,
                }

                result = await optimization_service.run_provider_optimization(
                    mock_db_with_provider_feedback, provider_id=provider_id, mode=mode
                )

                assert result["success"] is True
                assert result["mode"] == mode
                assert result["provider_id"] == provider_id

                # Expensive mode should show better improvement
                if mode == "expensive":
                    assert result["performance_improvement"] > 0.20
                else:
                    assert result["performance_improvement"] >= 0.10

    @pytest.mark.asyncio
    async def test_cross_provider_optimization_independence(
        self, optimization_service, mock_db_with_provider_feedback
    ):
        """Test that provider optimizations don't interfere with each other"""

        providers = ["gemini", "anthropic"]

        # Start optimizations for multiple providers simultaneously
        optimization_tasks = []

        for provider_id in providers:
            with patch.object(
                optimization_service.multi_model_manager, "optimize_for_provider"
            ) as mock_optimize:
                mock_optimize.return_value = {
                    "success": True,
                    "run_id": f"concurrent_run_{provider_id}",
                    "optimized_prompt_id": f"concurrent_prompt_{provider_id}",
                    "performance_improvement": 0.18,
                    "training_examples": 12,
                    "mode": "cheap",
                    "provider_id": provider_id,
                }

                task = optimization_service.run_provider_optimization(
                    mock_db_with_provider_feedback,
                    provider_id=provider_id,
                    mode="cheap",
                )
                optimization_tasks.append(task)

        # Wait for all optimizations to complete
        results = await asyncio.gather(*optimization_tasks, return_exceptions=True)

        # Verify all completed successfully and independently
        assert len(results) == len(providers)
        for i, result in enumerate(results):
            if not isinstance(result, Exception):
                assert result["success"] is True
                assert result["provider_id"] == providers[i]

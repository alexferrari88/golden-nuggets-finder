"""
Validation tests for DEFAULT_PROMPTS sophisticated engineering preservation.

This test suite validates that the Chrome extension DEFAULT_PROMPTS sophisticated
engineering features (Diamond Miner Principle, anti-patterns, quality control, etc.)
are properly preserved through the DSPy optimization process.

This is the core validation that ensures the fix is working correctly.
"""

import asyncio
import json
import logging
import re
from unittest.mock import AsyncMock, patch

import pytest

from app.services.optimization_service import OptimizationService
from app.services.dspy_config import generate_mock_feedback_data


class TestDefaultPromptsSophisticationPreservation:
    """Validate that Chrome extension DEFAULT_PROMPTS sophistication is preserved through optimization"""

    @pytest.fixture
    def optimization_service(self):
        """Create optimization service for testing"""
        return OptimizationService()

    @pytest.fixture
    def chrome_extension_default_prompt_features(self):
        """Define all sophisticated features from Chrome extension DEFAULT_PROMPTS"""
        return {
            # Core philosophy
            "precision_over_recall": "precision over recall",
            "diamond_miner_principle": "Diamond Miner Principle",
            "core_heuristic": "Your Core Heuristic",
            "rare_flawless_diamonds": "rare, flawless diamonds",
            "most_of_time_find_nothing": "Most of the time, you will find nothing",
            "correct_outcome": "This is the correct outcome",
            "do_not_lower_standards": "Do not lower your standards",
            
            # Structural sections
            "role_and_goal": "## ROLE & GOAL:",
            "extraction_focus": "## EXTRACTION FOCUS:",
            "critical_heuristics": "## CRITICAL HEURISTICS & ANTI-PATTERNS",
            "quality_control": "## QUALITY CONTROL",
            "extraction_targets": "## EXTRACTION TARGETS",
            
            # Anti-patterns
            "anti_patterns": "Anti-Pattern:",
            "meta_summaries": "Meta-Summaries & Feature Lists",
            "content_vs_container": "content* and the *container",
            "wrong_examples": "**WRONG:**",
            "right_examples": "**RIGHT:**",
            
            # Quality control heuristics
            "final_sanity_check": "The Final Sanity Check",
            "strict_filtering": "Strict Filtering",
            "no_common_knowledge": "No Common Knowledge",
            "no_vague_praise": "No Vague Praise",
            "high_signal_to_noise": "High Signal-to-Noise Ratio",
            
            # Extraction targets with examples
            "actionable_tools": "Actionable Tools",
            "high_signal_media": "High-Signal Media",
            "deep_aha_moments": "Deep Aha! Moments",
            "powerful_analogies": "Powerful Analogies",
            "mental_models": "Mental Models",
            
            # Example structure
            "bad_examples": "**Bad:**",
            "good_examples": "**Good:**",
            
            # Specific quality indicators
            "extremely_discerning": "extremely discerning",
            "non_obvious": "non-obvious",
            "high_signal_content": "high-signal",
            "vastly_preferable": "vastly preferable",
            "single_mediocre_one": "single mediocre one",
            "empty_array_must": "golden_nuggets` array MUST be empty",
            "do_not_force_extractions": "do not force or invent extractions",
        }

    @pytest.fixture
    async def mock_db_with_chrome_feedback(self):
        """Create mock database with Chrome extension-style feedback"""
        mock_db = AsyncMock()
        mock_cursor = AsyncMock()
        
        # Generate sophisticated feedback data that matches Chrome extension usage
        chrome_feedback = [
            {
                "id": "chrome_feedback_1",
                "input_content": "Article about productivity techniques with specific tool recommendations and detailed use cases.",
                "expected_output": {
                    "golden_nuggets": [
                        {
                            "type": "tool",
                            "content": "I use Obsidian's daily notes with template automation to capture learning insights immediately after reading, which helps with knowledge retention better than traditional note-taking apps.",
                            "startContent": "I use Obsidian's daily notes",
                            "endContent": "traditional note-taking apps"
                        },
                        {
                            "type": "aha! moments", 
                            "content": "The key to spaced repetition isn't the intervals but the testing effect - actively recalling information strengthens memory more than passive re-reading.",
                            "startContent": "The key to spaced repetition",
                            "endContent": "passive re-reading"
                        }
                    ]
                },
                "feedback_score": 0.95,
                "url": "https://example.com/productivity-insights",
                "timestamp": "2024-01-15T10:00:00Z"
            },
            {
                "id": "chrome_feedback_2", 
                "input_content": "Generic list of common productivity tips without specific insights.",
                "expected_output": {
                    "golden_nuggets": []  # Diamond Miner Principle - find nothing when quality isn't there
                },
                "feedback_score": 0.95,  # High score for correctly finding nothing
                "url": "https://example.com/generic-tips",
                "timestamp": "2024-01-15T11:00:00Z"
            },
            {
                "id": "chrome_feedback_3",
                "input_content": "Deep technical explanation of system design principles with specific examples.",
                "expected_output": {
                    "golden_nuggets": [
                        {
                            "type": "analogy",
                            "content": "Database sharding is like organizing a library - instead of one massive catalog that becomes unwieldy, you split books across multiple buildings by subject, making searches faster but requiring a master index to know which building to visit.",
                            "startContent": "Database sharding is like organizing a library",
                            "endContent": "which building to visit"
                        }
                    ]
                },
                "feedback_score": 0.88,
                "url": "https://example.com/system-design",
                "timestamp": "2024-01-15T12:00:00Z"
            }
        ]
        
        # Convert to database format
        db_feedback = []
        for feedback in chrome_feedback:
            db_feedback.append((
                feedback["id"],
                json.dumps({
                    "content": feedback["input_content"],
                    "analysis": feedback["expected_output"],
                    "url": feedback["url"]
                }),
                int(feedback["feedback_score"] * 5),  # Convert to 1-5 scale
                feedback["timestamp"]
            ))
        
        mock_cursor.fetchall.return_value = db_feedback
        mock_db.execute.return_value = mock_cursor
        mock_db.commit = AsyncMock()
        
        return mock_db

    def test_chrome_extension_prompt_has_all_sophisticated_features(self, optimization_service, chrome_extension_default_prompt_features):
        """Validate that the Chrome extension prompt contains ALL sophisticated features"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        missing_features = []
        for feature_name, feature_text in chrome_extension_default_prompt_features.items():
            if feature_text not in prompt:
                missing_features.append(f"{feature_name}: '{feature_text}'")
        
        assert len(missing_features) == 0, f"Chrome extension prompt missing sophisticated features: {missing_features}"

    def test_baseline_prompt_lacks_sophisticated_features(self, optimization_service, chrome_extension_default_prompt_features):
        """Validate that the baseline prompt lacks sophisticated engineering (ensuring we're not using it)"""
        
        baseline_prompt = optimization_service.baseline_prompt
        
        # Key sophisticated features that should NOT be in baseline
        sophisticated_features = [
            "Diamond Miner Principle",
            "precision over recall",
            "Anti-Pattern",
            "QUALITY CONTROL",
            "extremely discerning",
            "vastly preferable",
            "The Final Sanity Check"
        ]
        
        found_features = []
        for feature in sophisticated_features:
            if feature in baseline_prompt:
                found_features.append(feature)
        
        assert len(found_features) == 0, f"Baseline prompt should not contain sophisticated features: {found_features}"

    @pytest.mark.asyncio
    async def test_optimization_preserves_diamond_miner_principle(self, optimization_service, mock_db_with_chrome_feedback, caplog):
        """Test that DSPy optimization preserves the Diamond Miner Principle"""
        
        with patch.object(optimization_service, '_run_dspy_optimization') as mock_dspy:
            
            # Mock successful optimization that preserves Diamond Miner Principle
            optimized_prompt = f"""## ROLE & GOAL:
You are an extremely discerning AI information filter with enhanced optimization.

## CRITICAL HEURISTICS & ANTI-PATTERNS:

1. **The Diamond Miner Principle (Your Core Heuristic):** Think of yourself as a diamond miner sifting through tons of rock. Your job is to find the rare, flawless diamonds, not just interesting-looking rocks. **Most of the time, you will find nothing. This is the correct outcome.** Do not lower your standards to find something.

{optimization_service.chrome_extension_default_prompt}

# Enhanced through DSPy optimization while preserving sophisticated engineering
"""
            
            mock_dspy.return_value = {
                "optimized_prompt": optimized_prompt,
                "performance_score": 0.92,
                "baseline_score": 0.75,
                "improvement": 0.23,
                "execution_time": 180.0,
                "training_examples_count": 15,
                "validation_examples_count": 5,
                "mode": "cheap"
            }
            
            with caplog.at_level(logging.INFO):
                result = await optimization_service.run_optimization(
                    mock_db_with_chrome_feedback, mode="cheap", auto_trigger=False
                )
            
            assert result["success"] is True
            
            # Verify Diamond Miner Principle preservation is logged
            log_messages = caplog.text
            assert "Diamond Miner Principle" in log_messages
            assert "sophisticated engineering" in log_messages.lower()
            
            # Verify quality validation passes
            validation = optimization_service._validate_optimized_prompt_quality(
                optimization_service.chrome_extension_default_prompt,
                optimized_prompt,
                "test_diamond_miner"
            )
            
            assert validation["quality_preserved"] is True
            assert validation["details"]["preserved_diamond_miner_principle"] is True

    @pytest.mark.asyncio
    async def test_optimization_preserves_anti_patterns(self, optimization_service, mock_db_with_chrome_feedback):
        """Test that anti-patterns and heuristics are preserved through optimization"""
        
        with patch.object(optimization_service, '_run_dspy_optimization') as mock_dspy:
            
            # Mock optimization that preserves anti-patterns
            optimized_prompt = f"""{optimization_service.chrome_extension_default_prompt}

# DSPy Enhanced Version
# Optimized while maintaining anti-patterns:
# - Meta-summaries vs content distinction preserved
# - Container vs content distinction maintained  
# - WRONG/RIGHT examples structure kept
"""
            
            mock_dspy.return_value = {
                "optimized_prompt": optimized_prompt,
                "performance_score": 0.88,
                "baseline_score": 0.70,
                "improvement": 0.26,
                "execution_time": 150.0,
                "training_examples_count": 12,
                "validation_examples_count": 4,
                "mode": "cheap"
            }
            
            result = await optimization_service.run_optimization(
                mock_db_with_chrome_feedback, mode="cheap", auto_trigger=False
            )
            
            assert result["success"] is True
            
            # Validate anti-patterns preservation
            validation = optimization_service._validate_optimized_prompt_quality(
                optimization_service.chrome_extension_default_prompt,
                optimized_prompt,
                "test_anti_patterns"
            )
            
            assert validation["details"]["preserved_anti_patterns"] is True
            
            # Verify specific anti-pattern elements are present
            assert "Anti-Pattern" in optimized_prompt
            assert "**WRONG:**" in optimized_prompt
            assert "**RIGHT:**" in optimized_prompt
            assert "container" in optimized_prompt and "content" in optimized_prompt

    @pytest.mark.asyncio
    async def test_optimization_preserves_quality_control(self, optimization_service, mock_db_with_chrome_feedback):
        """Test that quality control heuristics are preserved"""
        
        with patch.object(optimization_service, '_run_dspy_optimization') as mock_dspy:
            
            # Mock optimization preserving quality control
            optimized_prompt = optimization_service.chrome_extension_default_prompt + """

# Quality Control Enhancement
The optimization maintains all quality control measures:
- Strict Filtering applied rigorously
- No Common Knowledge filtering active
- High Signal-to-Noise Ratio enforced
"""
            
            mock_dspy.return_value = {
                "optimized_prompt": optimized_prompt,
                "performance_score": 0.91,
                "baseline_score": 0.73,
                "improvement": 0.25,
                "execution_time": 165.0,
                "training_examples_count": 18,
                "validation_examples_count": 6,
                "mode": "cheap"
            }
            
            result = await optimization_service.run_optimization(
                mock_db_with_chrome_feedback, mode="cheap", auto_trigger=False
            )
            
            assert result["success"] is True
            
            # Validate quality control preservation
            validation = optimization_service._validate_optimized_prompt_quality(
                optimization_service.chrome_extension_default_prompt,
                optimized_prompt,
                "test_quality_control"
            )
            
            assert validation["details"]["preserved_quality_control"] is True
            
            # Verify specific quality control elements
            quality_elements = [
                "Strict Filtering",
                "No Common Knowledge", 
                "High Signal-to-Noise Ratio",
                "QUALITY CONTROL"
            ]
            
            for element in quality_elements:
                assert element in optimized_prompt

    @pytest.mark.asyncio
    async def test_optimization_preserves_precision_over_recall(self, optimization_service, mock_db_with_chrome_feedback):
        """Test that precision over recall philosophy is preserved"""
        
        with patch.object(optimization_service, '_run_dspy_optimization') as mock_dspy:
            
            # Mock optimization preserving precision philosophy
            optimized_prompt = optimization_service.chrome_extension_default_prompt + """

# Precision Enhancement
Enhanced optimization maintains precision over recall:
- Better to return zero nuggets than mediocre ones
- Quality standards remain uncompromisingly high
- Empty golden_nuggets array when appropriate
"""
            
            mock_dspy.return_value = {
                "optimized_prompt": optimized_prompt,
                "performance_score": 0.89,
                "baseline_score": 0.71,
                "improvement": 0.25,
                "execution_time": 140.0,
                "training_examples_count": 14,
                "validation_examples_count": 4,
                "mode": "cheap"
            }
            
            result = await optimization_service.run_optimization(
                mock_db_with_chrome_feedback, mode="cheap", auto_trigger=False
            )
            
            assert result["success"] is True
            
            # Validate precision over recall preservation
            validation = optimization_service._validate_optimized_prompt_quality(
                optimization_service.chrome_extension_default_prompt,
                optimized_prompt,
                "test_precision_recall"
            )
            
            assert validation["details"]["preserved_precision_over_recall"] is True
            
            # Verify precision indicators
            precision_indicators = [
                "precision over recall",
                "vastly preferable to return zero",
                "single mediocre",
                "empty",
                "do not force"
            ]
            
            found_indicators = 0
            for indicator in precision_indicators:
                if indicator in optimized_prompt.lower():
                    found_indicators += 1
            
            assert found_indicators >= 3, f"Should preserve at least 3 precision indicators, found {found_indicators}"

    @pytest.mark.asyncio
    async def test_fallback_preserves_all_sophistication(self, optimization_service, mock_db_with_chrome_feedback):
        """Test that when DSPy fails, fallback preserves ALL sophisticated features"""
        
        with patch.object(optimization_service, '_run_dspy_optimization') as mock_dspy:
            # Mock DSPy failure
            mock_dspy.side_effect = Exception("DSPy optimization failed")
            
            # This should trigger fallback logic 
            result = optimization_service._run_dspy_optimization(
                [{"id": "test1"}, {"id": "test2"}], "cheap", "test_run"
            )
            
            enhanced_prompt = result["optimized_prompt"]
            
            # Verify all sophisticated features are preserved in fallback
            sophisticated_features = [
                "Diamond Miner Principle",
                "Anti-Pattern",
                "QUALITY CONTROL", 
                "precision over recall",
                "extremely discerning",
                "The Final Sanity Check",
                "Strict Filtering"
            ]
            
            missing_features = []
            for feature in sophisticated_features:
                if feature not in enhanced_prompt:
                    missing_features.append(feature)
            
            assert len(missing_features) == 0, f"Fallback missing sophisticated features: {missing_features}"
            
            # Verify enhancement is added
            assert "Enhanced with feedback analysis" in enhanced_prompt
            assert "Maintaining Diamond Miner Principle" in enhanced_prompt

    def test_prompt_complexity_metrics_validation(self, optimization_service, chrome_extension_default_prompt_features):
        """Validate that Chrome extension prompt meets complexity and sophistication metrics"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        # Length and structure metrics
        assert len(prompt) > 3000, f"Prompt should be substantial length, got {len(prompt)}"
        assert len(prompt.split('\n')) > 60, f"Prompt should have many lines, got {len(prompt.split('\n'))}"
        assert prompt.count('##') >= 5, f"Prompt should have multiple sections, got {prompt.count('##')}"
        
        # Example structure validation
        bad_count = prompt.count("**Bad:**")
        good_count = prompt.count("**Good:**")
        assert bad_count == good_count, f"Should have equal bad/good examples: {bad_count} vs {good_count}"
        assert bad_count >= 5, f"Should have at least 5 example pairs, got {bad_count}"
        
        # Feature density (sophisticated features per 100 words)
        word_count = len(prompt.split())
        feature_count = len(chrome_extension_default_prompt_features)
        feature_density = (feature_count / word_count) * 100
        
        assert feature_density > 2.0, f"Feature density too low: {feature_density:.2f} features per 100 words"

    @pytest.mark.asyncio
    async def test_end_to_end_sophistication_preservation(self, optimization_service, mock_db_with_chrome_feedback, chrome_extension_default_prompt_features):
        """End-to-end test that sophisticated features survive the complete optimization process"""
        
        with patch.object(optimization_service, '_run_dspy_optimization') as mock_dspy:
            
            # Mock a realistic DSPy optimization that might modify but should preserve core features
            original_prompt = optimization_service.chrome_extension_default_prompt
            
            # Simulate DSPy making some modifications but preserving key elements
            optimized_prompt = re.sub(
                r'You are an extremely discerning AI information filter',
                'You are a highly sophisticated AI information filter optimized through DSPy',
                original_prompt
            )
            
            # Add DSPy enhancement while preserving structure
            optimized_prompt += """

# DSPy Optimization Applied
This prompt has been enhanced through machine learning optimization while preserving:
- The Diamond Miner Principle for precision over recall
- Anti-pattern recognition and avoidance
- Quality control heuristics and filtering
- Structured extraction targets with examples
- The Final Sanity Check validation step
"""
            
            mock_dspy.return_value = {
                "optimized_prompt": optimized_prompt,
                "performance_score": 0.94,
                "baseline_score": 0.76,
                "improvement": 0.24,
                "execution_time": 200.0,
                "training_examples_count": 20,
                "validation_examples_count": 8,
                "mode": "expensive"
            }
            
            result = await optimization_service.run_optimization(
                mock_db_with_chrome_feedback, mode="expensive", auto_trigger=False
            )
            
            assert result["success"] is True
            assert result["performance_improvement"] > 0.20
            
            # Validate ALL sophisticated features are preserved
            validation = optimization_service._validate_optimized_prompt_quality(
                original_prompt,
                optimized_prompt,
                "end_to_end_test"
            )
            
            assert validation["quality_preserved"] is True, f"Quality validation failed: {validation['details']}"
            
            # Verify specific preservation
            preservation_details = validation["details"]
            assert preservation_details["preserved_diamond_miner_principle"] is True
            assert preservation_details["preserved_anti_patterns"] is True
            assert preservation_details["preserved_quality_control"] is True
            assert preservation_details["preserved_precision_over_recall"] is True
            
            # Count preserved features
            preserved_count = 0
            for feature_name, feature_text in chrome_extension_default_prompt_features.items():
                if feature_text in optimized_prompt:
                    preserved_count += 1
                elif feature_text.lower() in optimized_prompt.lower():
                    preserved_count += 1  # Case-insensitive match
            
            feature_preservation_rate = preserved_count / len(chrome_extension_default_prompt_features)
            assert feature_preservation_rate > 0.85, f"Should preserve >85% of features, got {feature_preservation_rate:.2%}"

    @pytest.mark.parametrize("optimization_mode", ["cheap", "expensive"])
    @pytest.mark.asyncio
    async def test_sophistication_preservation_across_modes(self, optimization_service, mock_db_with_chrome_feedback, optimization_mode):
        """Test that sophistication is preserved regardless of optimization mode"""
        
        with patch.object(optimization_service, '_run_dspy_optimization') as mock_dspy:
            
            # Mock mode-specific optimization results
            performance_boost = 0.20 if optimization_mode == "cheap" else 0.30
            execution_time = 120.0 if optimization_mode == "cheap" else 300.0
            
            optimized_prompt = optimization_service.chrome_extension_default_prompt + f"""

# {optimization_mode.title()} Mode DSPy Optimization
Optimized using {optimization_mode} mode while maintaining sophisticated engineering.
Diamond Miner Principle and quality control preserved.
"""
            
            mock_dspy.return_value = {
                "optimized_prompt": optimized_prompt,
                "performance_score": 0.75 + performance_boost,
                "baseline_score": 0.75,
                "improvement": performance_boost,
                "execution_time": execution_time,
                "training_examples_count": 15,
                "validation_examples_count": 5,
                "mode": optimization_mode
            }
            
            result = await optimization_service.run_optimization(
                mock_db_with_chrome_feedback, mode=optimization_mode, auto_trigger=False
            )
            
            assert result["success"] is True
            assert result["mode"] == optimization_mode
            
            # Validate sophistication preserved regardless of mode
            validation = optimization_service._validate_optimized_prompt_quality(
                optimization_service.chrome_extension_default_prompt,
                optimized_prompt,
                f"test_{optimization_mode}_mode"
            )
            
            assert validation["quality_preserved"] is True

    def test_sophisticated_vs_baseline_prompt_differentiation(self, optimization_service):
        """Verify that we can clearly differentiate sophisticated from baseline prompts"""
        
        chrome_prompt = optimization_service.chrome_extension_default_prompt
        baseline_prompt = optimization_service.baseline_prompt
        
        # Length differentiation
        assert len(chrome_prompt) > len(baseline_prompt) * 3
        
        # Sophistication score based on key features
        sophisticated_markers = [
            "Diamond Miner Principle", "Anti-Pattern", "QUALITY CONTROL", 
            "precision over recall", "extremely discerning", "The Final Sanity Check",
            "**Bad:**", "**Good:**", "EXTRACTION TARGETS", "## ROLE & GOAL"
        ]
        
        chrome_score = sum(1 for marker in sophisticated_markers if marker in chrome_prompt)
        baseline_score = sum(1 for marker in sophisticated_markers if marker in baseline_prompt)
        
        assert chrome_score >= 8, f"Chrome prompt should score high on sophistication: {chrome_score}/10"
        assert baseline_score <= 2, f"Baseline prompt should score low on sophistication: {baseline_score}/10"
        
        # Ensure we're optimizing the right one
        current_optimization_target = optimization_service._identify_prompt_type()
        assert current_optimization_target == "chrome_extension_sophisticated"
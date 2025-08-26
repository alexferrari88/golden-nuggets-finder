"""
Unit tests for sophisticated prompt engineering preservation.

Tests that the Chrome extension DEFAULT_PROMPTS sophisticated engineering
features are properly preserved through DSPy optimization, including:
- Diamond Miner Principle
- Anti-patterns recognition
- Quality control heuristics
- Precision over recall philosophy
- Example-based learning structure
"""

import pytest
from unittest.mock import MagicMock, patch

from app.services.optimization_service import OptimizationService


class TestSophisticatedPromptPreservation:
    """Test preservation of sophisticated prompt engineering features"""

    @pytest.fixture
    def optimization_service(self):
        """Create optimization service for testing"""
        return OptimizationService()

    @pytest.fixture
    def sophisticated_prompt_features(self):
        """Define the sophisticated engineering features to preserve"""
        return {
            "diamond_miner_principle": "Diamond Miner Principle",
            "anti_patterns": "Anti-Pattern",
            "quality_control": "QUALITY CONTROL",
            "precision_over_recall": "precision over recall",
            "role_and_goal": "ROLE & GOAL",
            "extraction_focus": "EXTRACTION FOCUS",
            "extraction_targets": "EXTRACTION TARGETS",
            "final_sanity_check": "The Final Sanity Check",
            "strict_filtering": "Strict Filtering",
            "no_common_knowledge": "No Common Knowledge",
            "high_signal_to_noise": "High Signal-to-Noise Ratio",
            "actionable_tools": "Actionable Tools",
            "high_signal_media": "High-Signal Media",
            "deep_aha_moments": "Deep Aha! Moments",
            "powerful_analogies": "Powerful Analogies",
            "mental_models": "Mental Models",
            "examples_structure": "**Bad:**",
            "examples_structure_good": "**Good:**",
        }

    def test_chrome_extension_prompt_contains_all_features(self, optimization_service, sophisticated_prompt_features):
        """Test that Chrome extension prompt contains all sophisticated features"""
        prompt = optimization_service.chrome_extension_default_prompt
        
        for feature_name, feature_text in sophisticated_prompt_features.items():
            assert feature_text in prompt, f"Missing sophisticated feature: {feature_name} ('{feature_text}')"

    def test_baseline_prompt_lacks_sophistication(self, optimization_service, sophisticated_prompt_features):
        """Test that baseline prompt lacks sophisticated engineering features"""
        prompt = optimization_service.baseline_prompt
        
        sophisticated_features = [
            "Diamond Miner Principle",
            "Anti-Pattern", 
            "QUALITY CONTROL",
            "The Final Sanity Check",
            "precision over recall",
        ]
        
        for feature in sophisticated_features:
            assert feature not in prompt, f"Baseline should not have sophisticated feature: {feature}"

    def test_prompt_analysis_detects_sophistication(self, optimization_service):
        """Test that _log_prompt_analysis correctly detects sophisticated features"""
        
        # Test with Chrome extension prompt
        chrome_analysis = optimization_service._log_prompt_analysis(
            optimization_service.chrome_extension_default_prompt, "test_chrome"
        )
        
        assert chrome_analysis["has_diamond_miner_principle"] is True
        assert chrome_analysis["has_anti_patterns"] is True
        assert chrome_analysis["has_quality_control"] is True
        assert chrome_analysis["has_extraction_targets"] is True
        assert chrome_analysis["has_role_and_goal"] is True
        assert chrome_analysis["mentions_precision_over_recall"] is True
        assert chrome_analysis["uses_examples"] is True
        assert chrome_analysis["sophisticated_engineering"] is True
        
        # Test with baseline prompt
        baseline_analysis = optimization_service._log_prompt_analysis(
            optimization_service.baseline_prompt, "test_baseline"
        )
        
        assert baseline_analysis["has_diamond_miner_principle"] is False
        assert baseline_analysis["has_anti_patterns"] is False
        assert baseline_analysis["has_quality_control"] is False
        assert baseline_analysis["mentions_precision_over_recall"] is False

    def test_quality_validation_perfect_preservation(self, optimization_service):
        """Test quality validation when all features are perfectly preserved"""
        
        # Create optimized prompt that preserves all features
        original = optimization_service.chrome_extension_default_prompt
        optimized = original + "\n\n# Enhanced through DSPy optimization with preserved sophistication"
        
        validation = optimization_service._validate_optimized_prompt_quality(
            original, optimized, "test_run"
        )
        
        assert validation["quality_preserved"] is True
        assert validation["details"]["preserved_diamond_miner_principle"] is True
        assert validation["details"]["preserved_anti_patterns"] is True
        assert validation["details"]["preserved_quality_control"] is True
        assert validation["details"]["preserved_precision_over_recall"] is True

    def test_quality_validation_partial_loss(self, optimization_service):
        """Test quality validation when some features are lost"""
        
        original = optimization_service.chrome_extension_default_prompt
        
        # Create optimized prompt missing Diamond Miner Principle
        optimized = original.replace("Diamond Miner Principle", "Mining Principle")
        
        validation = optimization_service._validate_optimized_prompt_quality(
            original, optimized, "test_run"
        )
        
        assert validation["quality_preserved"] is False
        assert validation["details"]["preserved_diamond_miner_principle"] is False
        # Other features should still be preserved
        assert validation["details"]["preserved_anti_patterns"] is True
        assert validation["details"]["preserved_quality_control"] is True

    def test_quality_validation_complete_loss(self, optimization_service):
        """Test quality validation when sophisticated features are completely lost"""
        
        original = optimization_service.chrome_extension_default_prompt
        simplified = "You are helpful. Extract insights. Return JSON with golden_nuggets array."
        
        validation = optimization_service._validate_optimized_prompt_quality(
            original, simplified, "test_run"
        )
        
        assert validation["quality_preserved"] is False
        assert validation["details"]["preserved_diamond_miner_principle"] is False
        assert validation["details"]["preserved_anti_patterns"] is False
        assert validation["details"]["preserved_quality_control"] is False
        assert validation["details"]["preserved_precision_over_recall"] is False

    def test_quality_validation_case_insensitive_preservation(self, optimization_service):
        """Test that quality validation works with case variations"""
        
        original = optimization_service.chrome_extension_default_prompt
        
        # Create optimized prompt with case variations
        optimized = """
The DIAMOND MINER principle guides our extraction process.
We must avoid anti-patterns in our analysis.
Quality control is essential for precision-focused extraction.
Return valid JSON with the structure.
"""
        
        validation = optimization_service._validate_optimized_prompt_quality(
            original, optimized, "test_run"
        )
        
        # Should detect preservation despite case differences
        assert validation["details"]["preserved_diamond_miner_principle"] is True
        assert validation["details"]["preserved_anti_patterns"] is True
        assert validation["details"]["preserved_quality_control"] is True

    def test_sophisticated_features_hierarchy(self, optimization_service):
        """Test that sophisticated features are properly hierarchized"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        # Verify hierarchical structure exists
        sections = [
            "## ROLE & GOAL:",
            "## EXTRACTION FOCUS:", 
            "## CRITICAL HEURISTICS & ANTI-PATTERNS",
            "## QUALITY CONTROL",
            "## EXTRACTION TARGETS"
        ]
        
        last_position = -1
        for section in sections:
            position = prompt.find(section)
            assert position > last_position, f"Section '{section}' not in proper order"
            last_position = position

    def test_diamond_miner_principle_components(self, optimization_service):
        """Test that Diamond Miner Principle contains all key components"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        # Find the Diamond Miner Principle section
        principle_start = prompt.find("**The Diamond Miner Principle")
        principle_end = prompt.find("2.", principle_start)
        principle_text = prompt[principle_start:principle_end]
        
        # Verify key components of the principle
        key_components = [
            "diamond miner",
            "tons of rock",
            "rare, flawless diamonds",
            "interesting-looking rocks",
            "Most of the time, you will find nothing",
            "This is the correct outcome",
            "Do not lower your standards",
        ]
        
        for component in key_components:
            assert component in principle_text, f"Diamond Miner Principle missing component: {component}"

    def test_anti_patterns_structure(self, optimization_service):
        """Test that anti-patterns section has proper structure with examples"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        # Find anti-patterns section
        anti_pattern_start = prompt.find("**Anti-Pattern:")
        anti_pattern_end = prompt.find("3.", anti_pattern_start)
        anti_pattern_text = prompt[anti_pattern_start:anti_pattern_end]
        
        # Verify structure
        assert "**WRONG:**" in anti_pattern_text
        assert "**RIGHT:**" in anti_pattern_text
        assert "container" in anti_pattern_text
        assert "content" in anti_pattern_text

    def test_extraction_targets_completeness(self, optimization_service):
        """Test that all extraction target types are properly defined"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        # Find extraction targets section
        targets_start = prompt.find("## EXTRACTION TARGETS")
        targets_text = prompt[targets_start:]
        
        # Verify all 5 types are present with examples
        target_types = [
            ("Actionable Tools", "**Bad:**", "**Good:**"),
            ("High-Signal Media", "**Bad:**", "**Good:**"),
            ("Deep Aha! Moments", "**Bad:**", "**Good:**"),
            ("Powerful Analogies", "**Bad:**", "**Good:**"),
            ("Mental Models", "**Bad:**", "**Good:**"),
        ]
        
        for target_type, bad_marker, good_marker in target_types:
            # Find this target type section
            type_start = targets_text.find(f"**{target_type}:")
            assert type_start != -1, f"Missing target type: {target_type}"
            
            # Find the next target type or end
            next_type_start = len(targets_text)
            for other_type, _, _ in target_types:
                if other_type != target_type:
                    other_start = targets_text.find(f"**{other_type}:", type_start + 1)
                    if other_start != -1 and other_start < next_type_start:
                        next_type_start = other_start
            
            type_section = targets_text[type_start:next_type_start]
            
            # Verify examples structure
            assert bad_marker in type_section, f"{target_type} missing bad example"
            assert good_marker in type_section, f"{target_type} missing good example"

    def test_quality_control_heuristics(self, optimization_service):
        """Test that quality control section contains all heuristics"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        # Find quality control section
        qc_start = prompt.find("## QUALITY CONTROL")
        qc_end = prompt.find("## EXTRACTION TARGETS")
        qc_text = prompt[qc_start:qc_end]
        
        # Verify all quality control rules
        qc_rules = [
            "Strict Filtering",
            "No Common Knowledge", 
            "No Vague Praise",
            "High Signal-to-Noise Ratio",
        ]
        
        for rule in qc_rules:
            assert rule in qc_text, f"Quality control missing rule: {rule}"

    def test_precision_over_recall_philosophy(self, optimization_service):
        """Test that precision over recall philosophy is properly embedded"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        precision_indicators = [
            "precision over recall",
            "vastly preferable to return zero nuggets",
            "single mediocre one",
            "do not force or invent extractions",
            "golden_nuggets` array MUST be empty",
            "Most of the time, you will find nothing",
            "This is the correct outcome",
            "Do not lower your standards",
        ]
        
        for indicator in precision_indicators:
            assert indicator in prompt, f"Missing precision over recall indicator: {indicator}"

    @pytest.mark.parametrize("feature,expected", [
        ("has_diamond_miner_principle", True),
        ("has_anti_patterns", True), 
        ("has_quality_control", True),
        ("has_extraction_targets", True),
        ("has_role_and_goal", True),
        ("mentions_precision_over_recall", True),
        ("uses_examples", True),
        ("sophisticated_engineering", True),
    ])
    def test_prompt_analysis_parametrized(self, optimization_service, feature, expected):
        """Parametrized test for prompt analysis features"""
        
        analysis = optimization_service._log_prompt_analysis(
            optimization_service.chrome_extension_default_prompt, "test_run"
        )
        
        assert analysis[feature] == expected

    def test_enhanced_fallback_preserves_sophistication(self, optimization_service):
        """Test that enhanced fallback prompt preserves sophisticated engineering"""
        
        # Simulate the enhanced prompt creation from optimization failure
        training_examples = [{"id": "test1"}, {"id": "test2"}, {"id": "test3"}]
        
        enhanced_prompt = f"""{optimization_service.chrome_extension_default_prompt}

# Enhanced with feedback analysis
# Based on {len(training_examples)} user feedback examples, focus on:
# - High-quality content that users find valuable
# - Avoiding content that received negative feedback
# - Including user-identified missing golden nuggets
# - Maintaining Diamond Miner Principle and quality control heuristics

Return valid JSON with the exact structure: {{"golden_nuggets": [...]}}"""
        
        # Verify sophisticated features are preserved
        assert "Diamond Miner Principle" in enhanced_prompt
        assert "Anti-Pattern" in enhanced_prompt
        assert "QUALITY CONTROL" in enhanced_prompt
        assert "precision over recall" in enhanced_prompt
        
        # Verify enhancement is added
        assert "Enhanced with feedback analysis" in enhanced_prompt
        assert f"Based on {len(training_examples)} user feedback examples" in enhanced_prompt
        assert "Maintaining Diamond Miner Principle" in enhanced_prompt

    def test_prompt_length_and_complexity_metrics(self, optimization_service):
        """Test that sophisticated prompt meets complexity thresholds"""
        
        chrome_prompt = optimization_service.chrome_extension_default_prompt
        baseline_prompt = optimization_service.baseline_prompt
        
        # Length metrics
        assert len(chrome_prompt) > 2000  # Substantial length
        assert len(chrome_prompt) > len(baseline_prompt) * 3  # Much longer than baseline
        
        # Complexity metrics
        chrome_lines = chrome_prompt.split('\n')
        baseline_lines = baseline_prompt.split('\n')
        
        assert len(chrome_lines) > 50  # Many lines of instruction
        assert len(chrome_lines) > len(baseline_lines) * 2  # Much more complex
        
        # Section count
        chrome_sections = chrome_prompt.count('##')
        baseline_sections = baseline_prompt.count('##')
        
        assert chrome_sections >= 5  # Multiple structured sections
        assert chrome_sections > baseline_sections  # More structured

    def test_example_structure_consistency(self, optimization_service):
        """Test that all examples follow consistent Bad/Good structure"""
        
        prompt = optimization_service.chrome_extension_default_prompt
        
        # Count bad and good examples
        bad_count = prompt.count("**Bad:**")
        good_count = prompt.count("**Good:**")
        
        # Should have equal numbers (paired examples)
        assert bad_count == good_count
        assert bad_count >= 5  # At least 5 example pairs
        
        # Verify each bad is followed by a good within reasonable distance
        bad_positions = []
        good_positions = []
        
        pos = 0
        while True:
            pos = prompt.find("**Bad:**", pos)
            if pos == -1:
                break
            bad_positions.append(pos)
            pos += 1
            
        pos = 0
        while True:
            pos = prompt.find("**Good:**", pos)
            if pos == -1:
                break
            good_positions.append(pos)
            pos += 1
        
        # Each bad should be followed by a good
        for i, bad_pos in enumerate(bad_positions):
            assert i < len(good_positions), f"Bad example {i} not paired with good example"
            assert good_positions[i] > bad_pos, f"Good example {i} should come after bad example {i}"
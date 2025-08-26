"""
DSPy configuration and utilities for Golden Nuggets optimization.

Handles DSPy setup, model configuration, and optimization parameters
using Gemini 2.5-flash only.
"""

import json
import os
from typing import Any

try:
    import dspy  # type: ignore[import-untyped]
    from dspy.teleprompt import (  # type: ignore[import-untyped]
        BootstrapFewShotWithRandomSearch,
        MIPROv2,
    )

    DSPY_AVAILABLE = True
except ImportError:
    DSPY_AVAILABLE = False


class DSPyConfig:
    """Configuration manager for DSPy optimization using Google Gemini 2.5-flash only"""

    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")

        # Default optimization parameters
        self.optimization_params = {
            "expensive": {
                "num_candidates": 10,
                "init_temperature": 0.7,
                "num_threads": 2,
                "max_bootstrapped_demos": 12,
                "max_labeled_demos": 6,
            },
            "cheap": {
                "max_bootstrapped_demos": 8,
                "max_labeled_demos": 4,
                "num_candidate_programs": 6,
                "num_threads": 2,
                "temperature": 0.5,
            },
        }

    def is_configured(self) -> bool:
        """Check if DSPy can be properly configured with Gemini"""
        return DSPY_AVAILABLE and self.gemini_api_key is not None

    def get_language_model(self, model_name: str = "gemini-2.5-flash"):
        """Get configured DSPy language model using Gemini 2.5-flash"""
        if not DSPY_AVAILABLE:
            raise ImportError(
                "DSPy is not available. Install with: pip install dspy-ai"
            )

        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        try:
            # Use DSPy's native LM configuration for Gemini
            lm = dspy.LM(f"gemini/{model_name}", api_key=self.gemini_api_key)
            return lm
        except Exception as e:
            raise Exception(
                f"Failed to configure DSPy with Gemini {model_name}: {e}"
            ) from e

    def get_optimizer(self, mode: str):
        """Get configured DSPy optimizer"""
        if not DSPY_AVAILABLE:
            raise ImportError("DSPy is not available")

        lm = self.get_language_model()
        params = self.optimization_params.get(mode, {})

        if mode == "expensive":
            return MIPROv2(
                prompt_model=lm,
                task_model=lm,
                num_candidates=params.get("num_candidates", 10),
                init_temperature=params.get("init_temperature", 0.7),
                num_threads=params.get("num_threads", 2),
            )
        elif mode == "cheap":
            return BootstrapFewShotWithRandomSearch(
                max_bootstrapped_demos=params.get("max_bootstrapped_demos", 8),
                max_labeled_demos=params.get("max_labeled_demos", 4),
                num_candidate_programs=params.get("num_candidate_programs", 6),
                num_threads=params.get("num_threads", 2),
            )
        else:
            raise ValueError(f"Unknown optimization mode: {mode}")

    def configure_dspy(self):
        """Configure DSPy global settings with Gemini 2.5-flash"""
        if not DSPY_AVAILABLE:
            return False

        try:
            lm = self.get_language_model()
            dspy.configure(lm=lm)
            return True
        except Exception as e:
            print(f"Failed to configure DSPy with Gemini 2.5-flash: {e}")
            return False


# Only define DSPy-dependent classes if DSPy is available
if DSPY_AVAILABLE:

    class GoldenNuggetSignature(dspy.Signature):
        """DSPy signature for golden nugget extraction"""

        content = dspy.InputField(
            desc="Web content to analyze for valuable insights and golden nuggets"
        )
        golden_nuggets = dspy.OutputField(
            desc="JSON object containing extracted golden nuggets with type, startContent, and endContent fields. Each nugget should have startContent (first few words) and endContent (last few words) for precise location marking, limited to 5 words each."
        )

    class GoldenNuggetExtractor(dspy.Module):
        """DSPy module for extracting golden nuggets"""

        def __init__(self, signature=None):
            super().__init__()
            self.signature = signature or GoldenNuggetSignature
            self.extract = dspy.ChainOfThought(self.signature)

        def forward(self, content):
            """Extract golden nuggets from content"""
            result = self.extract(content=content)
            return result


# Placeholder classes when DSPy is not available
if not DSPY_AVAILABLE:

    class GoldenNuggetSignature:  # type: ignore[no-redef]
        """Placeholder when DSPy is not available"""

        pass

    class GoldenNuggetExtractor:  # type: ignore[no-redef]
        """Placeholder when DSPy is not available"""

        def __init__(self, signature=None):
            pass

        def forward(self, content):  # noqa: ARG002
            return None


class OptimizationMetrics:
    """Metrics and evaluation functions for DSPy optimization"""

    @staticmethod
    def golden_nugget_metric(example, pred, trace=None) -> float:  # noqa: ARG004
        """
        Evaluate quality of golden nugget extraction.

        Args:
            example: Training example with expected output
            pred: Predicted output from model
            trace: Optional execution trace

        Returns:
            Score between 0.0 and 1.0
        """
        try:
            # Parse JSON outputs
            try:
                predicted = json.loads(pred.golden_nuggets)
            except (json.JSONDecodeError, AttributeError):
                return 0.0  # Invalid JSON gets 0 score

            try:
                expected = json.loads(example.golden_nuggets)
            except (json.JSONDecodeError, AttributeError):
                return 0.0

            pred_nuggets = predicted.get("golden_nuggets", [])
            expected_nuggets = expected.get("golden_nuggets", [])

            # Handle empty cases
            if len(pred_nuggets) == 0 and len(expected_nuggets) == 0:
                return 1.0  # Both empty - perfect match
            elif len(pred_nuggets) == 0 or len(expected_nuggets) == 0:
                return 0.0  # One empty, one not - no match

            # Calculate structural similarity
            count_score = min(len(pred_nuggets), len(expected_nuggets)) / max(
                len(pred_nuggets), len(expected_nuggets)
            )

            # Calculate type alignment (bonus for correct types)
            expected_types = {nugget.get("type", "") for nugget in expected_nuggets}
            predicted_types = {nugget.get("type", "") for nugget in pred_nuggets}

            type_intersection = len(expected_types.intersection(predicted_types))
            type_union = len(expected_types.union(predicted_types))
            type_score = type_intersection / type_union if type_union > 0 else 0.0

            # Calculate content relevance (basic keyword overlap using startContent and endContent)
            expected_content = " ".join(
                f"{nugget.get('startContent', '')} {nugget.get('endContent', '')}" 
                for nugget in expected_nuggets
            ).lower()
            predicted_content = " ".join(
                f"{nugget.get('startContent', '')} {nugget.get('endContent', '')}" 
                for nugget in pred_nuggets
            ).lower()

            expected_words = set(expected_content.split())
            predicted_words = set(predicted_content.split())

            if len(expected_words) > 0:
                content_overlap = len(
                    expected_words.intersection(predicted_words)
                ) / len(expected_words)
            else:
                content_overlap = 0.0

            # Combined score (weighted average)
            final_score = (
                0.4 * count_score  # Structure similarity
                + 0.3 * type_score  # Type accuracy
                + 0.3 * content_overlap  # Content relevance
            )

            return min(final_score, 1.0)

        except Exception as e:
            print(f"Warning: Error in golden_nugget_metric: {e}")
            return 0.0

    @staticmethod
    def accuracy_metric(example, pred, trace=None) -> float:  # noqa: ARG004
        """Simple binary accuracy metric"""
        try:
            predicted = json.loads(pred.golden_nuggets)
            expected = json.loads(example.golden_nuggets)

            pred_count = len(predicted.get("golden_nuggets", []))
            expected_count = len(expected.get("golden_nuggets", []))

            # Binary classification: extracted something vs extracted nothing
            pred_has_nuggets = pred_count > 0
            expected_has_nuggets = expected_count > 0

            return 1.0 if pred_has_nuggets == expected_has_nuggets else 0.0

        except Exception:
            return 0.0


def create_training_examples(feedback_data: list) -> list:
    """Convert feedback data to DSPy training examples"""
    if not DSPY_AVAILABLE:
        return []

    examples = []

    for item in feedback_data:
        try:
            example = dspy.Example(
                content=item["input_content"],
                golden_nuggets=json.dumps(item["expected_output"]),
            ).with_inputs("content")

            examples.append(example)

        except Exception as e:
            print(f"Warning: Failed to create training example: {e}")
            continue

    return examples


def validate_dspy_environment() -> dict[str, Any]:
    """Validate DSPy environment and configuration with Gemini"""
    status: dict[str, Any] = {
        "dspy_available": DSPY_AVAILABLE,
        "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY")),
        "configuration_valid": False,
        "test_model_accessible": False,
        "using_gemini": True,
        "errors": [],
    }

    if not DSPY_AVAILABLE:
        status["errors"].append(
            "DSPy is not installed. Install with: pip install dspy-ai"
        )
        return status

    if not status["gemini_key_configured"]:
        status["errors"].append("GEMINI_API_KEY environment variable is required")
        return status

    try:
        config = DSPyConfig()
        config.configure_dspy()
        status["configuration_valid"] = True

        # Test model access
        lm = config.get_language_model()

        # Simple test call to verify connection
        try:
            test_response = lm.request("Test connection", max_tokens=10)
            status["test_model_accessible"] = bool(test_response)
        except Exception as e:
            status["errors"].append(f"Gemini model test call failed: {e!s}")

    except Exception as e:
        status["errors"].append(f"DSPy configuration failed: {e!s}")

    return status


# Test utilities for DSPy optimization


def generate_mock_feedback_data(count: int = 50) -> list:
    """Generate mock feedback data for testing DSPy optimization"""
    import random

    nugget_types = ["tool", "media", "aha! moments", "analogy", "model"]

    mock_data = []

    for i in range(count):
        # Generate variety of examples
        has_nuggets = random.random() > 0.3  # 70% have nuggets

        if has_nuggets:
            num_nuggets = random.randint(1, 3)
            nuggets = []

            for j in range(num_nuggets):
                nuggets.append(
                    {
                        "type": random.choice(nugget_types),
                        "content": f"Mock nugget content {i}_{j} with valuable insight",
                    }
                )

            expected_output = {"golden_nuggets": nuggets}
            feedback_score = random.uniform(0.7, 1.0)  # High quality examples

        else:
            expected_output = {"golden_nuggets": []}
            feedback_score = random.uniform(0.0, 0.3)  # Low quality examples

        mock_data.append(
            {
                "id": f"mock_{i}",
                "input_content": f"Mock content {i} for testing DSPy optimization with various scenarios and edge cases.",
                "expected_output": expected_output,
                "feedback_score": feedback_score,
                "url": f"https://example.com/test/{i}",
                "timestamp": "2024-01-01T00:00:00Z",
            }
        )

    return mock_data

# Backend Tests

This directory contains the test suite for the Golden Nuggets Finder backend.

## Structure

```
tests/
├── conftest.py           # Shared pytest fixtures
├── integration/          # API and database integration tests
│   ├── test_main.py      # Core FastAPI endpoint tests
│   └── test_api_error_handling.py  # API error response tests
├── unit/                 # Unit tests for individual components
│   ├── test_feedback_service.py    # Feedback service logic tests
│   ├── test_optimization.py        # DSPy optimization service tests
│   └── test_error_handling.py      # Service layer error scenarios
├── manual/               # Manual test scripts (not run in CI)
│   ├── test_deduplication.py
│   ├── test_monitoring.py
│   └── ...other manual scripts
├── fixtures/             # Test data fixtures (future use)
└── run_error_tests.py    # Quick runner for error handling tests
```

## Running Tests

### Core Test Suite (Recommended)
```bash
# Run integration and unit tests
pytest tests/integration tests/unit

# With coverage
pytest tests/integration tests/unit --cov=app --cov-report=term-missing

# Run error handling tests specifically
python tests/run_error_tests.py
```

### All Tests (Including Manual)
```bash
# Run all tests (may include manual tests that require setup)
pytest

# Exclude manual tests
pytest --ignore=tests/manual/
```

### Specific Test Categories
```bash
# Only integration tests
pytest tests/integration/

# Only unit tests  
pytest tests/unit/

# Run with markers
pytest -m "integration"
pytest -m "unit"
```

## Test Categories

### Integration Tests (`tests/integration/`)
- **test_main.py**: Core FastAPI endpoints with real database
- **test_api_error_handling.py**: API error responses and edge cases
- Test complete request/response cycles
- Verify API contract compliance and error handling
- **Coverage**: All major API endpoints plus error scenarios

### Unit Tests (`tests/unit/`)
- **test_feedback_service.py**: Feedback storage and deduplication logic
- **test_optimization.py**: DSPy optimization and configuration testing
- **test_error_handling.py**: Service layer error scenarios and resilience
- Test individual service classes with mocked dependencies
- **Coverage**: Core business logic, DSPy integration, error handling

### Manual Tests (`tests/manual/`)
- Scripts for manual testing and debugging
- Performance benchmarking  
- Integration with external APIs (Gemini, DSPy)
- **Not run in automated CI**
- **⚠️ Require `FORCE_TEST_DB=1` to prevent production database pollution**

#### Running Manual Tests Safely
```bash
# ALWAYS use FORCE_TEST_DB=1 with manual tests
FORCE_TEST_DB=1 python3 tests/manual/test_dashboard_backend.py
FORCE_TEST_DB=1 python3 tests/manual/test_monitoring.py
FORCE_TEST_DB=1 python3 tests/manual/test_improved_cost_tracking.py

# With sample data (where supported)
FORCE_TEST_DB=1 python3 tests/manual/test_dashboard_backend.py --with-sample-data
```

**Critical**: Manual tests will use the production database (`data/feedback.db`) if run without `FORCE_TEST_DB=1`, potentially corrupting your data.

## Configuration

Test configuration is defined in `pyproject.toml`:
- Async test support with `pytest-asyncio`
- Coverage reporting with `pytest-cov`
- Warning filters for clean output
- Custom markers for test categorization

## Fixtures

Shared fixtures are defined in `conftest.py`:
- `clean_database`: Provides isolated test database with automatic cleanup
- `setup_database`: Legacy fixture name (uses `clean_database` internally)
- `event_loop`: Manages async event loop for tests
- `verify_test_environment`: Safety check ensuring tests run in test environment

### Test Database Isolation
- **Pytest tests**: Automatic isolation using temporary databases per test
- **Manual tests**: Must use `FORCE_TEST_DB=1` environment variable
- **Safety mechanisms**: Multiple environment detection methods prevent production database access

## Coverage

Current coverage: **50%** (654/1308 lines)

Key areas with good coverage:
- `app/models.py`: 100% (Pydantic models)
- Core business logic in services

Areas needing improvement:
- Database migration scripts
- Error handling paths
- Manual/admin endpoints

## Best Practices

1. **Database Isolation**: 
   - Always use `FORCE_TEST_DB=1` for manual tests
   - Use `clean_database` fixture for pytest tests
   - Never run tests against production database

2. **Use unique IDs**: Tests use `uuid.uuid4()` for unique test data
3. **Async fixtures**: Use `@pytest_asyncio.fixture` for async setup  
4. **Proper cleanup**: Database is initialized per test as needed
5. **Clear test names**: Descriptive test function names
6. **Organized by purpose**: Clear separation of unit vs integration tests
7. **Environment safety**: Verify test environment detection before database operations

## Common Commands

### Automated Tests
```bash
# Quick test run (recommended)
pytest tests/integration tests/unit

# With verbose output
pytest tests/integration tests/unit -v

# Run specific test
pytest tests/integration/test_main.py::test_health_check

# Generate HTML coverage report
pytest tests/integration tests/unit --cov=app --cov-report=html

# Exclude manual tests from all runs
pytest tests/ --ignore=tests/manual/
```

### Manual Tests  
```bash
# ALWAYS use FORCE_TEST_DB=1 for manual tests
FORCE_TEST_DB=1 python3 tests/manual/test_dashboard_backend.py
FORCE_TEST_DB=1 python3 tests/manual/test_monitoring.py

# Check environment detection
python3 -c "from app.database import is_test_environment; print('Test env:', is_test_environment())"
```
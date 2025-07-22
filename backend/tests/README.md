# Backend Tests

This directory contains the test suite for the Golden Nuggets Finder backend.

## Structure

```
tests/
├── conftest.py           # Shared pytest fixtures
├── integration/          # API and database integration tests
│   └── test_main.py      # FastAPI endpoint tests
├── unit/                 # Unit tests for individual components
│   └── test_optimization.py  # DSPy optimization service tests
├── manual/               # Manual test scripts (not run in CI)
│   ├── test_deduplication.py
│   ├── test_monitoring.py
│   └── ...other manual scripts
└── fixtures/             # Test data fixtures (future use)
```

## Running Tests

### Core Test Suite (Recommended)
```bash
# Run integration and unit tests
pytest tests/integration tests/unit

# With coverage
pytest tests/integration tests/unit --cov=app --cov-report=term-missing
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
- Test FastAPI endpoints with real database
- Test complete request/response cycles
- Verify API contract compliance
- **Coverage**: All major API endpoints (POST /feedback, GET /optimize/*, etc.)

### Unit Tests (`tests/unit/`)
- Test individual service classes and functions
- Mock external dependencies
- Test error handling and edge cases
- **Coverage**: DSPy configuration, optimization service, metrics

### Manual Tests (`tests/manual/`)
- Scripts for manual testing and debugging
- Performance benchmarking
- Integration with external APIs (Gemini, DSPy)
- **Not run in automated CI**

## Configuration

Test configuration is defined in `pyproject.toml`:
- Async test support with `pytest-asyncio`
- Coverage reporting with `pytest-cov`
- Warning filters for clean output
- Custom markers for test categorization

## Fixtures

Shared fixtures are defined in `conftest.py`:
- `setup_database`: Initializes test database
- `event_loop`: Manages async event loop for tests

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

1. **Use unique IDs**: Tests use `uuid.uuid4()` for unique test data
2. **Async fixtures**: Use `@pytest_asyncio.fixture` for async setup
3. **Proper cleanup**: Database is initialized per test as needed
4. **Clear test names**: Descriptive test function names
5. **Organized by purpose**: Clear separation of unit vs integration tests

## Common Commands

```bash
# Quick test run
pytest tests/integration tests/unit

# With verbose output
pytest tests/integration tests/unit -v

# Run specific test
pytest tests/integration/test_main.py::test_health_check

# Generate HTML coverage report
pytest tests/integration tests/unit --cov=app --cov-report=html
```
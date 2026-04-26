import pytest

from app.db.init_db import init_db


@pytest.fixture(autouse=True)
def _init_database() -> None:
    """Ensure metadata (including new tables) exists for API tests."""
    init_db()

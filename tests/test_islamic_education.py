"""Tests for Islamic Education Service."""
from app.services.islamic_education_service import (
    get_standards,
    get_courses,
    get_standard_by_id,
    get_education_stats,
)


def test_get_all_standards():
    result = get_standards()
    assert len(result) == 15
    orgs = {s["org"] for s in result}
    assert "AAOIFI" in orgs
    assert "IFSB" in orgs


def test_get_standards_by_org():
    aaoifi = get_standards(org="AAOIFI")
    assert all(s["org"] == "AAOIFI" for s in aaoifi)
    assert len(aaoifi) == 10

    ifsb = get_standards(org="IFSB")
    assert all(s["org"] == "IFSB" for s in ifsb)
    assert len(ifsb) == 5


def test_get_standards_by_category():
    shariah = get_standards(category="shariah")
    assert all(s["category"] == "shariah" for s in shariah)
    assert len(shariah) > 0


def test_get_standard_by_id_found():
    result = get_standard_by_id("SS8")
    assert result is not None
    assert result["title_en"] == "Murabaha"


def test_get_standard_by_id_not_found():
    result = get_standard_by_id("NONEXISTENT")
    assert result is None


def test_get_all_courses():
    result = get_courses()
    assert len(result) == 5


def test_get_courses_by_level():
    beginner = get_courses(level="beginner")
    assert all(c["level"] == "beginner" for c in beginner)

    advanced = get_courses(level="advanced")
    assert all(c["level"] == "advanced" for c in advanced)


def test_education_stats():
    stats = get_education_stats()
    assert stats["total_standards"] == 15
    assert stats["aaoifi_count"] == 10
    assert stats["ifsb_count"] == 5
    assert stats["total_courses"] == 5
    assert stats["total_modules"] > 0
    assert stats["total_hours"] > 0

"""Islamic Education Router - AAOIFI/IFSB standards and courses API."""
from fastapi import APIRouter, Query

from app.services.islamic_education_service import (
    get_standards,
    get_courses,
    get_standard_by_id,
    get_education_stats,
)

router = APIRouter(prefix="/islamic/education", tags=["islamic-education"])


@router.get("/standards")
def list_standards(
    org: str | None = Query(None, description="Filter by org: AAOIFI or IFSB"),
    category: str | None = Query(None, description="Filter by category"),
):
    """List AAOIFI and IFSB standards."""
    return get_standards(org=org, category=category)


@router.get("/standards/{standard_id}")
def read_standard(standard_id: str):
    """Get a specific standard by ID."""
    result = get_standard_by_id(standard_id)
    if not result:
        return {"error": "Standard not found"}
    return result


@router.get("/courses")
def list_courses(
    level: str | None = Query(None, description="Filter by level: beginner, intermediate, advanced"),
):
    """List available Islamic finance courses."""
    return get_courses(level=level)


@router.get("/stats")
def education_stats():
    """Get education module statistics."""
    return get_education_stats()

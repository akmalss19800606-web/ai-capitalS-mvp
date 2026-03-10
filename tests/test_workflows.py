"""SEC-004: Tests for workflow endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestWorkflows:
    """Tests for /api/v1/workflows endpoints."""

    @pytest.mark.workflows
    def test_list_workflow_definitions(self, client: TestClient, auth_headers: dict):
        """List workflow definitions."""
        response = client.get("/api/v1/workflows/definitions", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.workflows
    def test_list_workflow_instances(self, client: TestClient, auth_headers: dict):
        """List workflow instances for user."""
        response = client.get("/api/v1/workflows/instances", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.workflows
    def test_workflows_unauthorized(self, client: TestClient):
        """Workflow endpoints without auth should fail."""
        response = client.get("/api/v1/workflows/definitions")
        assert response.status_code == 401

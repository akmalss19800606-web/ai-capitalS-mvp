"""Islamic Contracts Router - API endpoints for contract types catalog."""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.services.islamic_contracts_service import ContractsService

router = APIRouter(prefix="/islamic/contracts", tags=["islamic-contracts"])


@router.get("/")
def list_contracts(
    contract_type: Optional[str] = Query(None, description="Filter by type"),
):
    """List all Islamic contract types."""
    return ContractsService.list_contracts(contract_type)


@router.get("/types")
def get_contract_types():
    """Get available contract type categories."""
    return ContractsService.get_contract_types()


@router.get("/{contract_id}")
def get_contract(contract_id: str):
    """Get details of a specific contract type."""
    contract = ContractsService.get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

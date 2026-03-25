"""Islamic Contracts Service - catalog of Shariah-compliant contract types."""
import logging
from typing import Any

logger = logging.getLogger(__name__)

CONTRACTS = [
    {
        "id": "murabaha",
        "name": "Murabaha",
        "name_ar": "\u0645\u0631\u0627\u0628\u062d\u0629",
        "type": "trade",
        "aaoifi_standard": "SS 8",
        "risk_level": "low",
        "description": "Cost-plus financing. Bank buys asset and sells to client at disclosed markup.",
    },
    {
        "id": "mudaraba",
        "name": "Mudaraba",
        "name_ar": "\u0645\u0636\u0627\u0631\u0628\u0629",
        "type": "investment",
        "aaoifi_standard": "SS 13",
        "risk_level": "high",
        "description": "Profit-sharing partnership. One provides capital, other provides expertise.",
    },
    {
        "id": "musharaka",
        "name": "Musharaka",
        "name_ar": "\u0645\u0634\u0627\u0631\u0643\u0629",
        "type": "investment",
        "aaoifi_standard": "SS 12",
        "risk_level": "medium",
        "description": "Joint venture with shared profit and loss.",
    },
    {
        "id": "ijara",
        "name": "Ijara",
        "name_ar": "\u0625\u062c\u0627\u0631\u0629",
        "type": "lease",
        "aaoifi_standard": "SS 9",
        "risk_level": "low",
        "description": "Leasing agreement. Bank buys asset and leases to client.",
    },
    {
        "id": "salam",
        "name": "Salam",
        "name_ar": "\u0633\u0644\u0645",
        "type": "trade",
        "aaoifi_standard": "SS 10",
        "risk_level": "medium",
        "description": "Forward sale with advance payment and deferred delivery.",
    },
    {
        "id": "istisna",
        "name": "Istisna",
        "name_ar": "\u0627\u0633\u062a\u0635\u0646\u0627\u0639",
        "type": "manufacturing",
        "aaoifi_standard": "SS 11",
        "risk_level": "medium",
        "description": "Manufacturing contract. Payment in stages for goods not yet produced.",
    },
    {
        "id": "wakala",
        "name": "Wakala",
        "name_ar": "\u0648\u0643\u0627\u0644\u0629",
        "type": "agency",
        "aaoifi_standard": "SS 23",
        "risk_level": "low",
        "description": "Agency contract. Agent acts on behalf of principal for a fee.",
    },
    {
        "id": "qard_hasan",
        "name": "Qard Hasan",
        "name_ar": "\u0642\u0631\u0636 \u062d\u0633\u0646",
        "type": "benevolent",
        "aaoifi_standard": "SS 19",
        "risk_level": "low",
        "description": "Interest-free loan. Borrower returns only the principal.",
    },
]


class ContractsService:
    """Service for Islamic contract types catalog."""

    @staticmethod
    def list_contracts(
        contract_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """List all contracts, optionally filtered by type."""
        if contract_type:
            return [c for c in CONTRACTS if c["type"] == contract_type]
        return CONTRACTS

    @staticmethod
    def get_contract(contract_id: str) -> dict[str, Any] | None:
        """Get a specific contract by ID."""
        for c in CONTRACTS:
            if c["id"] == contract_id:
                return c
        return None

    @staticmethod
    def get_contract_types() -> list[str]:
        """Get unique contract types."""
        return list({c["type"] for c in CONTRACTS})

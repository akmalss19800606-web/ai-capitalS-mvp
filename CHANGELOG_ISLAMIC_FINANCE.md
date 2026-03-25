# Changelog - Islamic Finance Module

## [1.0.0] - 2026-03-25

### Added
- Zakat calculator with nisab tracking (gold price API)
- Shariah screening engine (AAOIFI/IFSB standards)
- Sukuk management (ijara, mudaraba, musharaka, murabaha, wakala, hybrid)
- Takaful insurance plans with contribution calculator
- Waqf endowment projects with progress tracking and stats dashboard
- SSB (Shariah Supervisory Board) members and fatwa registry
- P2P Islamic finance (mudaraba, musharaka, murabaha, ijara investments)
- Islamic compliance checker (multi-standard AAOIFI/IFSB/OJK)
- Education module with courses and certifications
- Islamic market indices with risk assessment
- Contract types catalog (8 categories of Islamic contracts)
- Dividend purification calculator
- Arabic/Russian glossary of Islamic finance terms
- Products catalog with AAOIFI references
- PoSC (Proof of Shariah Compliance) certificates
- Reference registry of standards
- Full frontend integration (13 pages under /islamic-finance)
- Seed data for glossary, products, references, companies
- API documentation in docs/islamic_finance_module.md
- 40+ unit and integration tests
- E2E smoke tests for all endpoints

### Backend Services
- `islamic_stage1.py` - SSB, Fatwa, P2P models
- `islamic_stage3.py` - Sukuk, Takaful, Waqf models
- 10 service modules with business logic
- 10 router modules with REST endpoints
- All endpoints under `/api/v1/islamic/` prefix

### Frontend Pages
- Dashboard, Zakat, Screening, Purification
- SSB/Fatwas, P2P, Sukuk, Takaful, Waqf
- Glossary, Products, PoSC
- Compliance Checker, Risk Assessment
- Contracts, Reports, Education, Indices

### Standards
- AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions)
- IFSB (Islamic Financial Services Board)
- Uzbekistan market regulatory compliance

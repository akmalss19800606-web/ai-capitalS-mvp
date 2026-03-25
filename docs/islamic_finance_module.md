# Islamic Finance Module - API Documentation

## Overview
Complete Islamic finance module for AI Capital MVP, designed for the Uzbekistan market.
Includes AAOIFI/IFSB compliance, sukuk, takaful, waqf, education, and risk assessment.

## API Endpoints

### Zakat
- `GET /api/v1/islamic/zakat/nisab` - Current nisab threshold
- `POST /api/v1/islamic/zakat/calculate` - Calculate zakat
- `GET /api/v1/islamic/zakat/history` - Zakat calculation history

### Shariah Screening
- `GET /api/v1/islamic/screening/companies` - List companies
- `POST /api/v1/islamic/screening/screen` - Screen a company
- `GET /api/v1/islamic/screening/results` - Screening results

### SSB & Fatwas
- `GET /api/v1/islamic/ssb/members` - SSB board members
- `GET /api/v1/islamic/ssb/fatwas` - Fatwa registry

### P2P Islamic Investment
- `GET /api/v1/islamic/p2p/projects` - P2P projects
- `POST /api/v1/islamic/p2p/invest` - Make investment

### Sukuk
- `GET /api/v1/islamic/sukuk` - List sukuk issuances
- `POST /api/v1/islamic/sukuk` - Create sukuk

### Takaful
- `GET /api/v1/islamic/takaful` - List takaful plans
- `POST /api/v1/islamic/takaful/calculate` - Calculate contribution

### Waqf
- `GET /api/v1/islamic/waqf` - List waqf projects
- `GET /api/v1/islamic/waqf/stats` - Waqf statistics

### Education
- `GET /api/v1/islamic/education/standards` - AAOIFI/IFSB standards
- `GET /api/v1/islamic/education/courses` - Available courses
- `GET /api/v1/islamic/education/stats` - Education statistics

### Indices & Risk
- `GET /api/v1/islamic/indices/` - Islamic market indices
- `GET /api/v1/islamic/indices/{id}/history` - Index history
- `POST /api/v1/islamic/indices/risk-assessment` - Portfolio risk assessment

### Compliance
- `POST /api/v1/islamic/compliance/check` - Run compliance check
- `GET /api/v1/islamic/compliance/report/{id}` - Get report

### Contracts
- `GET /api/v1/islamic/contracts/types` - Contract types
- `POST /api/v1/islamic/contracts/generate` - Generate contract

## Frontend Pages
- `/islamic-finance` - Dashboard
- `/islamic-finance/sukuk` - Sukuk marketplace
- `/islamic-finance/takaful` - Takaful with calculator
- `/islamic-finance/waqf` - Waqf projects with stats
- `/islamic-finance/education` - AAOIFI/IFSB education
- `/islamic-finance/indices` - Market indices
- `/islamic-finance/compliance` - Compliance checker
- `/islamic-finance/contracts` - Islamic contracts
- `/islamic-finance/reports` - Analytics & reports
- `/islamic-finance/risk` - Risk assessment

## Standards Supported
- AAOIFI Shariah Standards (SS 1-26)
- AAOIFI Accounting Standards (FAS)
- AAOIFI Governance Standards (GS)
- IFSB Prudential Standards (IFSB 1-10)
- Uzbekistan regulatory requirements

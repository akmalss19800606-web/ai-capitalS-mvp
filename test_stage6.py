"""Stage 6 verification: Portfolio Analytics Engine — 10 tests"""
import asyncio, sys, time
sys.path.insert(0, '/app')

from app.services.portfolio_analytics_service import (
    calculate_dcf, what_if_analysis, monte_carlo_simulation,
    get_business_cases, get_business_case_by_id,
)

async def run():
    passed = 0
    total = 10

    # 1. DCF
    r = await calculate_dcf([100e6, 150e6, 200e6, 250e6, 300e6], 0.15, 0.03, 500e6)
    assert r["npv"] > 0 and r["irr"] is not None
    print(f"[1/10] DCF: NPV={r['npv']:,.0f} IRR={r['irr_pct']}% — OK")
    passed += 1

    # 2. IRR edge
    r2 = await calculate_dcf([-10, -20], 0.10, 0.0, 100)
    assert r2["irr"] is None
    print(f"[2/10] IRR edge (no solution) — OK")
    passed += 1

    # 3. Sensitivity table
    assert len(r["sensitivity_table"]) >= 5
    print(f"[3/10] Sensitivity: {len(r['sensitivity_table'])} rows — OK")
    passed += 1

    # 4. What-if
    w = await what_if_analysis([100e6, 150e6, 200e6], 0.15)
    assert len(w["scenarios"]) >= 3
    print(f"[4/10] What-if: {len(w['scenarios'])} scenarios — OK")
    passed += 1

    # 5. Tornado
    assert len(w["tornado"]) >= 2
    print(f"[5/10] Tornado: {len(w['tornado'])} variables — OK")
    passed += 1

    # 6. Monte Carlo
    t0 = time.time()
    mc = await monte_carlo_simulation([100e6, 150e6, 200e6, 250e6], 0.15, 5000)
    elapsed = time.time() - t0
    assert elapsed < 3.0
    print(f"[6/10] MC 5000 sims: {elapsed:.2f}s, P(profit)={mc['probability_profit_pct']}% — OK")
    passed += 1

    # 7. MC histogram
    assert len(mc["histogram"]) >= 10
    print(f"[7/10] MC histogram: {len(mc['histogram'])} bins — OK")
    passed += 1

    # 8. Business cases >=50
    cases = get_business_cases()
    assert len(cases) >= 50
    cats = set(c["category"] for c in cases)
    print(f"[8/10] Cases: {len(cases)} in {len(cats)} categories — OK")
    passed += 1

    # 9. Case detail + cash flows
    detail = get_business_case_by_id(cases[0]["id"])
    assert detail and "cash_flows" in detail
    print(f"[9/10] Case: {detail['name']}, {len(detail['cash_flows'])} years — OK")
    passed += 1

    # 10. DCF on case
    dcf = await calculate_dcf(
        [cf * 1e6 for cf in detail["cash_flows"]],
        detail["discount_rate"],
        initial_investment=detail["initial_investment"] * 1e6,
    )
    assert dcf["npv"] is not None
    print(f"[10/10] Case DCF: NPV={dcf['npv']:,.0f} — OK")
    passed += 1

    print(f"\nRESULT: {passed}/{total} passed")
    return passed == total

ok = asyncio.run(run())
sys.exit(0 if ok else 1)

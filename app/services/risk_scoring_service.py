"""
risk_scoring_service.py — Tasks 101-120: AI-powered risk scoring and investment analysis.
"""
from __future__ import annotations
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio


# Risk score weights
WEIGHTS = {
    'concentration': 0.30,
    'liquidity': 0.20,
    'market_risk': 0.25,
    'performance': 0.25,
}


def score_concentration_risk(db: Session, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
    """Task 101-104: Calculate portfolio concentration risk (0-100)."""
    try:
        q = db.query(InvestmentDecision)
        if portfolio_id:
            q = q.filter(InvestmentDecision.portfolio_id == portfolio_id)
        total = q.with_entities(func.sum(InvestmentDecision.total_value)).scalar() or 0
        cat_rows = q.with_entities(
            InvestmentDecision.category,
            func.sum(InvestmentDecision.total_value).label('val')
        ).group_by(InvestmentDecision.category).all()
        if not cat_rows or not total:
            return {'score': 0, 'level': 'unknown', 'details': {}}
        # Herfindahl-Hirschman Index (HHI)
        hhi = sum((float(r.val or 0) / float(total)) ** 2 for r in cat_rows)
        # Convert HHI to risk score (0=diversified, 100=concentrated)
        score = round(hhi * 100, 1)
        level = 'low' if score < 25 else ('medium' if score < 50 else 'high')
        return {
            'score': score,
            'level': level,
            'hhi': round(hhi, 4),
            'num_categories': len(cat_rows),
            'categories': {r.category or 'N/A': round(float(r.val or 0) / float(total) * 100, 1) for r in cat_rows},
        }
    except Exception as e:
        return {'score': 0, 'level': 'error', 'error': str(e)}


def score_performance_risk(db: Session, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
    """Task 105-108: Score investment performance risk."""
    try:
        q = db.query(InvestmentDecision)
        if portfolio_id:
            q = q.filter(InvestmentDecision.portfolio_id == portfolio_id)
        total = q.count()
        completed = q.filter(InvestmentDecision.status == 'completed').count()
        active = q.filter(InvestmentDecision.status == 'active').count()
        pending = q.filter(InvestmentDecision.status == 'pending').count()
        if not total:
            return {'score': 50, 'level': 'unknown', 'details': {}}
        completion_rate = completed / total
        pending_rate = pending / total
        # High pending rate = high risk, high completion = low risk
        score = round((1 - completion_rate + pending_rate) / 2 * 100, 1)
        level = 'low' if score < 30 else ('medium' if score < 60 else 'high')
        return {
            'score': min(score, 100),
            'level': level,
            'completion_rate': round(completion_rate * 100, 1),
            'pending_rate': round(pending_rate * 100, 1),
            'total': total, 'completed': completed, 'active': active, 'pending': pending,
        }
    except Exception as e:
        return {'score': 50, 'level': 'error', 'error': str(e)}

def compute_composite_risk_score(db: Session, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
    """Task 109-113: Compute weighted composite risk score."""
    concentration = score_concentration_risk(db, portfolio_id)
    performance = score_performance_risk(db, portfolio_id)
    conc_score = concentration.get('score', 50)
    perf_score = performance.get('score', 50)
    composite = round(
        conc_score * WEIGHTS['concentration'] + perf_score * WEIGHTS['performance'] +
        50 * (WEIGHTS['liquidity'] + WEIGHTS['market_risk']),  # default 50 for unavailable
        1
    )
    level = 'low' if composite < 30 else ('medium' if composite < 60 else 'high')
    return {
        'composite_score': composite,
        'level': level,
        'components': {
            'concentration': {'score': conc_score, 'level': concentration.get('level'), 'weight': WEIGHTS['concentration']},
            'performance': {'score': perf_score, 'level': performance.get('level'), 'weight': WEIGHTS['performance']},
            'liquidity': {'score': 50, 'level': 'medium', 'weight': WEIGHTS['liquidity'], 'note': 'not computed'},
            'market_risk': {'score': 50, 'level': 'medium', 'weight': WEIGHTS['market_risk'], 'note': 'not computed'},
        },
        'generated_at': datetime.utcnow().isoformat(),
    }


def generate_investment_recommendations(db: Session, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
    """Task 114-118: Generate actionable investment recommendations."""
    risk = compute_composite_risk_score(db, portfolio_id)
    concentration = risk['components']['concentration']
    performance = risk['components']['performance']
    recommendations = []
    # Concentration recommendations
    if concentration['level'] == 'high':
        recommendations.append({
            'priority': 'high',
            'category': 'diversification',
            'action': 'Reduce concentration in top category',
            'detail': 'Portfolio is heavily concentrated. Consider adding investments in underrepresented sectors.',
            'expected_impact': 'Reduce risk score by 15-25 points',
        })
    elif concentration['level'] == 'medium':
        recommendations.append({
            'priority': 'medium',
            'category': 'diversification',
            'action': 'Moderate diversification improvement',
            'detail': 'Add 2-3 investments in different categories to improve HHI.',
            'expected_impact': 'Reduce concentration risk by 10-15 points',
        })
    # Performance recommendations
    if performance['level'] == 'high':
        recommendations.append({
            'priority': 'high',
            'category': 'execution',
            'action': 'Action pending investment decisions',
            'detail': 'Large number of pending decisions indicating execution delays.',
            'expected_impact': 'Improve completion rate and reduce execution risk',
        })
    # Overall score recommendation
    if risk['composite_score'] < 30:
        recommendations.append({
            'priority': 'low',
            'category': 'general',
            'action': 'Maintain current strategy',
            'detail': 'Portfolio risk is well-managed. Continue current approach.',
            'expected_impact': 'Sustain low-risk profile',
        })
    return {
        'portfolio_id': portfolio_id,
        'risk_score': risk['composite_score'],
        'risk_level': risk['level'],
        'total_recommendations': len(recommendations),
        'recommendations': recommendations,
        'generated_at': datetime.utcnow().isoformat(),
    }


def score_single_investment(investment: Dict[str, Any]) -> Dict[str, Any]:
    """Task 119-120: Score a single investment decision."""
    score = 50  # baseline
    flags = []
    value = float(investment.get('total_value', 0) or 0)
    if value > 10_000_000:
        score -= 15
        flags.append('Very high value investment - elevated risk')
    elif value > 1_000_000:
        score -= 5
        flags.append('High value investment')
    status = investment.get('status', '')
    if status == 'completed':
        score += 20
    elif status == 'active':
        score += 10
    elif status == 'pending':
        score -= 10
        flags.append('Pending decision - execution risk')
    category = investment.get('category', '')
    if not category:
        score -= 10
        flags.append('Missing category classification')
    geography = investment.get('geography', '')
    if not geography:
        score -= 5
        flags.append('Missing geography data')
    score = max(0, min(100, score))
    level = 'low' if score >= 70 else ('medium' if score >= 40 else 'high')
    return {
        'investment_score': score,
        'risk_level': level,
        'flags': flags,
        'recommendation': 'Approve' if score >= 60 else ('Review' if score >= 40 else 'Reject'),
    }

"""
olap_report_service.py — Tasks 36-50: OLAP report generation, AI insights, export.
"""
from __future__ import annotations
import json
import csv
import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio


def generate_portfolio_report(db: Session, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
    """Task 36-38: Generate full portfolio analytics report."""
    try:
        q = db.query(InvestmentDecision)
        if portfolio_id:
            q = q.filter(InvestmentDecision.portfolio_id == portfolio_id)
        decisions = q.all()
        total_value = sum(float(d.total_value or 0) for d in decisions)
        by_category: Dict[str, Dict] = {}
        by_status: Dict[str, int] = {}
        by_geography: Dict[str, float] = {}
        for d in decisions:
            cat = d.category or 'N/A'
            if cat not in by_category:
                by_category[cat] = {'count': 0, 'value': 0.0}
            by_category[cat]['count'] += 1
            by_category[cat]['value'] += float(d.total_value or 0)
            status = d.status or 'N/A'
            by_status[status] = by_status.get(status, 0) + 1
            geo = d.geography or 'N/A'
            by_geography[geo] = by_geography.get(geo, 0.0) + float(d.total_value or 0)
        return {
            'generated_at': datetime.utcnow().isoformat(),
            'portfolio_id': portfolio_id,
            'total_decisions': len(decisions),
            'total_value': round(total_value, 2),
            'avg_value': round(total_value / len(decisions), 2) if decisions else 0,
            'by_category': by_category,
            'by_status': by_status,
            'by_geography': by_geography,
        }
    except Exception as e:
        return {'error': str(e), 'generated_at': datetime.utcnow().isoformat()}

def export_decisions_csv(db: Session, portfolio_id: Optional[int] = None) -> str:
    """Task 39-42: Export investment decisions to CSV string."""
    try:
        q = db.query(InvestmentDecision)
        if portfolio_id:
            q = q.filter(InvestmentDecision.portfolio_id == portfolio_id)
        decisions = q.order_by(InvestmentDecision.created_at.desc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'id', 'asset_name', 'category', 'geography', 'status',
            'decision_type', 'total_value', 'portfolio_id', 'created_at', 'updated_at'
        ])
        for d in decisions:
            writer.writerow([
                d.id, d.asset_name, d.category, d.geography, d.status,
                d.decision_type, d.total_value, d.portfolio_id,
                str(d.created_at), str(d.updated_at)
            ])
        return output.getvalue()
    except Exception as e:
        return f'error,{str(e)}'


def generate_ai_insights(db: Session, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
    """Task 43-47: Generate AI-driven insights from portfolio data."""
    try:
        report = generate_portfolio_report(db, portfolio_id)
        insights = []
        total = report.get('total_value', 0)
        by_cat = report.get('by_category', {})
        by_status = report.get('by_status', {})
        # Concentration risk
        if by_cat:
            top_cat = max(by_cat.items(), key=lambda x: x[1]['value'])
            top_pct = round(top_cat[1]['value'] / total * 100, 1) if total else 0
            if top_pct > 40:
                insights.append({
                    'type': 'risk',
                    'severity': 'high',
                    'title': 'High concentration risk',
                    'message': f"Category '{top_cat[0]}' represents {top_pct}% of portfolio value.",
                    'recommendation': 'Consider diversifying across more categories.'
                })
            else:
                insights.append({
                    'type': 'positive',
                    'severity': 'low',
                    'title': 'Good diversification',
                    'message': f"Top category '{top_cat[0]}' is {top_pct}% - well diversified.",
                    'recommendation': 'Maintain current diversification strategy.'
                })
        # Active/pending ratio
        active = by_status.get('active', 0)
        pending = by_status.get('pending', 0)
        total_d = report.get('total_decisions', 1)
        if pending / total_d > 0.3:
            insights.append({
                'type': 'warning',
                'severity': 'medium',
                'title': 'High pending decisions',
                'message': f"{pending} decisions ({round(pending/total_d*100)}%) are still pending.",
                'recommendation': 'Review and action pending investment decisions.'
            })
        return {
            'generated_at': datetime.utcnow().isoformat(),
            'portfolio_id': portfolio_id,
            'total_insights': len(insights),
            'insights': insights,
            'summary': report,
        }
    except Exception as e:
        return {'error': str(e), 'insights': []}


def generate_trend_analysis(db: Session, months: int = 12) -> Dict[str, Any]:
    """Task 48-50: Analyze trends over time."""
    try:
        rows = db.query(
            func.date_trunc('month', InvestmentDecision.created_at).label('period'),
            func.sum(InvestmentDecision.total_value).label('total_value'),
            func.count(InvestmentDecision.id).label('count'),
            func.avg(InvestmentDecision.total_value).label('avg_value'),
        ).group_by('period').order_by('period').all()
        data = [
            {
                'period': str(r.period)[:10],
                'total_value': float(r.total_value or 0),
                'count': r.count,
                'avg_value': round(float(r.avg_value or 0), 2)
            }
            for r in rows
        ]
        # Calculate MoM growth rates
        for i in range(1, len(data)):
            prev = data[i-1]['total_value']
            curr = data[i]['total_value']
            data[i]['mom_growth'] = round((curr - prev) / prev * 100, 2) if prev else 0
        if data:
            data[0]['mom_growth'] = 0
        # Overall trend direction
        if len(data) >= 2:
            first_val = data[0]['total_value']
            last_val = data[-1]['total_value']
            trend = 'up' if last_val > first_val else ('down' if last_val < first_val else 'flat')
            total_growth = round((last_val - first_val) / first_val * 100, 2) if first_val else 0
        else:
            trend = 'insufficient_data'
            total_growth = 0
        return {
            'generated_at': datetime.utcnow().isoformat(),
            'periods_analyzed': len(data),
            'trend_direction': trend,
            'total_growth_pct': total_growth,
            'data': data,
        }
    except Exception as e:
        return {'error': str(e), 'data': []}

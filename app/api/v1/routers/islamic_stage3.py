"""
Islamic Finance Stage 3 API Router
PoSC, SSB Review, Auditors, P2P Islamic Projects
"""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.islamic_stage3 import (
    PoSCRule, PoSCCase, PoSCFinding,
    SSBReviewQueue, IslamicAuditorRegistry, P2PIslamicProject,
)
from app.schemas.islamic_stage3 import (
    PoSCRuleCreate, PoSCRuleUpdate, PoSCRuleOut,
    PoSCCaseCreate, PoSCCaseOut, PoSCCaseList,
    SSBReviewCreate, SSBReviewDecision, SSBReviewOut,
    AuditorCreate, AuditorUpdate, AuditorOut,
    P2PProjectCreate, P2PProjectUpdate, P2PProjectOut, P2PProjectList,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/islamic-stage3", tags=["islamic-stage3"])


# ---- PoSC Rules ----

@router.get("/posc/rules", response_model=List[PoSCRuleOut])
def list_posc_rules(
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PoSCRule)
    if category:
        q = q.filter(PoSCRule.category == category)
    if is_active is not None:
        q = q.filter(PoSCRule.is_active == is_active)
    return q.all()


@router.post("/posc/rules", response_model=PoSCRuleOut, status_code=status.HTTP_201_CREATED)
def create_posc_rule(
    data: PoSCRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = PoSCRule(**data.dict())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/posc/rules/{rule_id}", response_model=PoSCRuleOut)
def update_posc_rule(
    rule_id: UUID,
    data: PoSCRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = db.query(PoSCRule).filter(PoSCRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return rule


# ---- PoSC Cases ----

@router.post("/posc/cases", response_model=PoSCCaseOut, status_code=status.HTTP_201_CREATED)
def create_posc_case(
    data: PoSCCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = PoSCCase(user_id=current_user.id, **data.dict())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/posc/cases", response_model=List[PoSCCaseList])
def list_posc_cases(
    object_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PoSCCase).filter(PoSCCase.user_id == current_user.id)
    if object_type:
        q = q.filter(PoSCCase.object_type == object_type)
    if status_filter:
        q = q.filter(PoSCCase.status == status_filter)
    return q.order_by(PoSCCase.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/posc/cases/{case_id}", response_model=PoSCCaseOut)
def get_posc_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(PoSCCase).filter(
        PoSCCase.id == case_id, PoSCCase.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


# ---- SSB Review Queue ----

@router.post("/ssb/reviews", response_model=SSBReviewOut, status_code=status.HTTP_201_CREATED)
def create_ssb_review(
    data: SSBReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(PoSCCase).filter(PoSCCase.id == data.posc_case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="PoSC case not found")
    review = SSBReviewQueue(requested_by=current_user.id, **data.dict())
    db.add(review)
    case.status = "sent_to_ssb"
    db.commit()
    db.refresh(review)
    return review


@router.get("/ssb/reviews", response_model=List[SSBReviewOut])
def list_ssb_reviews(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SSBReviewQueue)
    if status_filter:
        q = q.filter(SSBReviewQueue.status == status_filter)
    return q.order_by(SSBReviewQueue.requested_at.desc()).all()


@router.put("/ssb/reviews/{review_id}/decide", response_model=SSBReviewOut)
def decide_ssb_review(
    review_id: UUID,
    data: SSBReviewDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime
    review = db.query(SSBReviewQueue).filter(SSBReviewQueue.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = data.status
    review.decision_note = data.decision_note
    review.standard_refs = data.standard_refs
    review.decided_at = datetime.utcnow()
    review.assigned_to = current_user.id
    # Update parent case status
    case = db.query(PoSCCase).filter(PoSCCase.id == review.posc_case_id).first()
    if case:
        status_map = {"approved": "ssb_approved", "rejected": "ssb_rejected"}
        case.status = status_map.get(data.status, case.status)
    db.commit()
    db.refresh(review)
    return review


# ---- Islamic Auditor Registry ----

@router.get("/auditors", response_model=List[AuditorOut])
def list_auditors(
    qualification: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(IslamicAuditorRegistry)
    if qualification:
        q = q.filter(IslamicAuditorRegistry.qualification == qualification)
    if is_active is not None:
        q = q.filter(IslamicAuditorRegistry.is_active == is_active)
    return q.all()


@router.post("/auditors", response_model=AuditorOut, status_code=status.HTTP_201_CREATED)
def create_auditor(
    data: AuditorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    auditor = IslamicAuditorRegistry(**data.dict())
    db.add(auditor)
    db.commit()
    db.refresh(auditor)
    return auditor


@router.put("/auditors/{auditor_id}", response_model=AuditorOut)
def update_auditor(
    auditor_id: UUID,
    data: AuditorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    auditor = db.query(IslamicAuditorRegistry).filter(IslamicAuditorRegistry.id == auditor_id).first()
    if not auditor:
        raise HTTPException(status_code=404, detail="Auditor not found")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(auditor, k, v)
    db.commit()
    db.refresh(auditor)
    return auditor


# ---- P2P Islamic Projects ----

@router.post("/p2p/projects", response_model=P2PProjectOut, status_code=status.HTTP_201_CREATED)
def create_p2p_project(
    data: P2PProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = P2PIslamicProject(created_by=current_user.id, **data.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/p2p/projects", response_model=List[P2PProjectList])
def list_p2p_projects(
    structure_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    is_esg: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(P2PIslamicProject)
    if structure_type:
        q = q.filter(P2PIslamicProject.structure_type == structure_type)
    if status_filter:
        q = q.filter(P2PIslamicProject.status == status_filter)
    if is_esg is not None:
        q = q.filter(P2PIslamicProject.is_esg == is_esg)
    return q.order_by(P2PIslamicProject.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/p2p/projects/{project_id}", response_model=P2PProjectOut)
def get_p2p_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(P2PIslamicProject).filter(P2PIslamicProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/p2p/projects/{project_id}", response_model=P2PProjectOut)
def update_p2p_project(
    project_id: UUID,
    data: P2PProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(P2PIslamicProject).filter(
        P2PIslamicProject.id == project_id,
        P2PIslamicProject.created_by == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(project, k, v)
    db.commit()
    db.refresh(project)
    return project

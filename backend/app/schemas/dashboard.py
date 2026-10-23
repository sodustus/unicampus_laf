from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.report import ReportResponse
from app.schemas.claim import ClaimResponse
from app.schemas.audit import AuditLogResponse


class UserDashboardStats(BaseModel):
    active_reports_count: int
    recovered_reports_count: int
    total_claims_count: int
    action_required_claims_count: int


class UserDashboardResponse(BaseModel):
    stats: UserDashboardStats
    active_reports: List[ReportResponse]
    recovered_reports: List[ReportResponse]
    my_claims: List[ClaimResponse]


class AdminDashboardStats(BaseModel):
    total_reports: int
    lost_reports: int
    found_reports: int
    active_reports: int
    recovered_reports: int
    recovery_rate_percent: float
    total_users: int
    pending_claims: int


class AdminUserItem(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime
    reports_count: int
    claims_count: int


class AdminDashboardResponse(BaseModel):
    stats: AdminDashboardStats
    pending_claims: List[ClaimResponse]
    recent_activity: List[AuditLogResponse]

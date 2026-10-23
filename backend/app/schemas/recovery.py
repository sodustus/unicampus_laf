from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class RecoveryRecordCreate(BaseModel):
    handover_notes: Optional[str] = None


class RecoveryRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int
    claim_id: Optional[int] = None
    responsible_user_id: int
    handover_notes: Optional[str] = None
    recovered_at: datetime

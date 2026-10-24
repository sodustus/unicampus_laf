import pytest
from app.db.session import SessionLocal
from app.models.report import Report
from app.models.claim import Claim, VerificationRecord
from app.models.recovery import RecoveryRecord
from app.models.audit import AuditLog
from app.models.user import User


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_database():
    """
    Session-level fixture that snapshots primary entity IDs before running tests,
    and cleans up any newly created reports, claims, records, or users after the
    test session finishes. This prevents test pollution from accumulating in the
    live database (e.g. duplicate reports or orphan claims).
    """
    db = SessionLocal()
    initial_report_ids = set(r.id for r in db.query(Report.id).all())
    initial_claim_ids = set(c.id for c in db.query(Claim.id).all())
    initial_verif_ids = set(v.id for v in db.query(VerificationRecord.id).all())
    initial_recovery_ids = set(rec.id for rec in db.query(RecoveryRecord.id).all())
    initial_audit_ids = set(a.id for a in db.query(AuditLog.id).all())
    initial_user_ids = set(u.id for u in db.query(User.id).all())
    db.close()

    yield

    db = SessionLocal()
    try:
        # 1. Clean up audit logs created during test run
        new_audit_ids = set(a.id for a in db.query(AuditLog.id).all()) - initial_audit_ids
        if new_audit_ids:
            db.query(AuditLog).filter(AuditLog.id.in_(new_audit_ids)).delete(synchronize_session=False)

        # 2. Clean up new verification records
        new_verif_ids = set(v.id for v in db.query(VerificationRecord.id).all()) - initial_verif_ids
        if new_verif_ids:
            db.query(VerificationRecord).filter(VerificationRecord.id.in_(new_verif_ids)).delete(synchronize_session=False)

        # 3. Clean up new recovery records
        new_rec_ids = set(rec.id for rec in db.query(RecoveryRecord.id).all()) - initial_recovery_ids
        if new_rec_ids:
            db.query(RecoveryRecord).filter(RecoveryRecord.id.in_(new_rec_ids)).delete(synchronize_session=False)

        # 4. Clean up new claims and their child records
        new_claim_ids = set(c.id for c in db.query(Claim.id).all()) - initial_claim_ids
        if new_claim_ids:
            db.query(VerificationRecord).filter(VerificationRecord.claim_id.in_(new_claim_ids)).delete(synchronize_session=False)
            db.query(RecoveryRecord).filter(RecoveryRecord.claim_id.in_(new_claim_ids)).delete(synchronize_session=False)
            db.query(Claim).filter(Claim.id.in_(new_claim_ids)).delete(synchronize_session=False)

        # 5. Clean up new reports and their child records
        new_report_ids = set(r.id for r in db.query(Report.id).all()) - initial_report_ids
        if new_report_ids:
            assoc_claims = [c.id for c in db.query(Claim.id).filter(Claim.report_id.in_(new_report_ids)).all()]
            if assoc_claims:
                db.query(VerificationRecord).filter(VerificationRecord.claim_id.in_(assoc_claims)).delete(synchronize_session=False)
                db.query(RecoveryRecord).filter(RecoveryRecord.claim_id.in_(assoc_claims)).delete(synchronize_session=False)
                db.query(Claim).filter(Claim.id.in_(assoc_claims)).delete(synchronize_session=False)
            db.query(RecoveryRecord).filter(RecoveryRecord.report_id.in_(new_report_ids)).delete(synchronize_session=False)
            db.query(Report).filter(Report.id.in_(new_report_ids)).delete(synchronize_session=False)

        # 6. Clean up temporary test users created during test run
        new_user_ids = set(u.id for u in db.query(User.id).all()) - initial_user_ids
        if new_user_ids:
            db.query(AuditLog).filter(AuditLog.actor_id.in_(new_user_ids)).delete(synchronize_session=False)
            db.query(Report).filter(Report.founder_id.in_(new_user_ids)).update({Report.founder_id: None}, synchronize_session=False)
            db.query(User).filter(User.id.in_(new_user_ids)).delete(synchronize_session=False)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error during conftest test database teardown: {e}")
    finally:
        db.close()

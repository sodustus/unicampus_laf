import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.report import Report
from app.models.claim import Claim, VerificationRecord
from app.models.recovery import RecoveryRecord
from app.models.audit import AuditLog
from app.core.security import hash_password


def normalize_accounts():
    db = SessionLocal()
    try:
        print("--- Starting UniCampus Account Normalization & Data Purge ---")

        # Target IDs for the 6 retained accounts
        retained_ids = {1, 2, 25, 28, 29, 30}

        # 1. Identify all ephemeral users
        ephemeral_users = db.query(User).filter(~User.id.in_(retained_ids)).all()
        ephemeral_user_ids = {u.id for u in ephemeral_users}
        print(f"Found {len(ephemeral_user_ids)} ephemeral accounts to purge: {sorted(ephemeral_user_ids)}")

        if ephemeral_user_ids:
            # 2. Identify all ephemeral reports
            ephemeral_reports = db.query(Report).filter(Report.owner_id.in_(ephemeral_user_ids)).all()
            ephemeral_report_ids = {r.id for r in ephemeral_reports}
            print(f"Found {len(ephemeral_report_ids)} reports owned by ephemeral accounts: {sorted(ephemeral_report_ids)}")

            # 3. Identify all ephemeral claims
            ephemeral_claims = (
                db.query(Claim)
                .filter(
                    (Claim.claimant_id.in_(ephemeral_user_ids))
                    | (Claim.report_id.in_(ephemeral_report_ids))
                )
                .all()
            )
            ephemeral_claim_ids = {c.id for c in ephemeral_claims}
            print(f"Found {len(ephemeral_claim_ids)} claims to purge: {sorted(ephemeral_claim_ids)}")

            # 4. Delete verification records tied to ephemeral claims
            if ephemeral_claim_ids:
                del_verif = (
                    db.query(VerificationRecord)
                    .filter(VerificationRecord.claim_id.in_(ephemeral_claim_ids))
                    .delete(synchronize_session=False)
                )
                print(f"Deleted {del_verif} verification records.")

            # 5. Delete recovery records tied to ephemeral claims, reports, or responsible users
            del_rec = (
                db.query(RecoveryRecord)
                .filter(
                    (RecoveryRecord.claim_id.in_(ephemeral_claim_ids))
                    | (RecoveryRecord.report_id.in_(ephemeral_report_ids))
                    | (RecoveryRecord.responsible_user_id.in_(ephemeral_user_ids))
                )
                .delete(synchronize_session=False)
            )
            print(f"Deleted {del_rec} recovery records.")

            # 6. Delete ephemeral claims
            if ephemeral_claim_ids:
                del_claim = (
                    db.query(Claim)
                    .filter(Claim.id.in_(ephemeral_claim_ids))
                    .delete(synchronize_session=False)
                )
                print(f"Deleted {del_claim} claims.")

            # 7. Delete audit logs associated with ephemeral actors or deleted targets
            del_audit = (
                db.query(AuditLog)
                .filter(
                    (AuditLog.actor_id.in_(ephemeral_user_ids))
                    | (
                        (AuditLog.target_type == "report")
                        & (AuditLog.target_id.in_(ephemeral_report_ids))
                    )
                    | (
                        (AuditLog.target_type == "claim")
                        & (AuditLog.target_id.in_(ephemeral_claim_ids))
                    )
                )
                .delete(synchronize_session=False)
            )
            print(f"Deleted {del_audit} audit logs.")

            # 8. Unlink founder_id on any retained reports if it points to an ephemeral user
            retained_reports_with_founder = (
                db.query(Report)
                .filter(
                    Report.id.notin_(ephemeral_report_ids),
                    Report.founder_id.in_(ephemeral_user_ids),
                )
                .all()
            )
            for rep in retained_reports_with_founder:
                rep.founder_id = None
            if retained_reports_with_founder:
                print(f"Unlinked founder_id on {len(retained_reports_with_founder)} retained reports.")

            # 9. Delete ephemeral reports
            if ephemeral_report_ids:
                del_rep = (
                    db.query(Report)
                    .filter(Report.id.in_(ephemeral_report_ids))
                    .delete(synchronize_session=False)
                )
                print(f"Deleted {del_rep} reports.")

            # 10. Delete ephemeral users
            del_usr = (
                db.query(User)
                .filter(User.id.in_(ephemeral_user_ids))
                .delete(synchronize_session=False)
            )
            print(f"Deleted {del_usr} ephemeral users.")

        # 11. Normalize the 6 retained accounts
        accounts_spec = {
            1: {
                "email": "admin@campus.edu",
                "full_name": "Campus Administrator",
                "phone_number": "+251911000000",
                "department": "Campus Security & Administration",
                "role": UserRole.ADMIN.value,
                "password": "admin123",
            },
            2: {
                "email": "abebebikila@campus.edu",
                "full_name": "Abebe Bikila",
                "phone_number": "+251911223344",
                "department": "Computer Science & IT",
                "role": UserRole.USER.value,
                "password": "password123",
            },
            29: {
                "email": "fatumaroba@campus.edu",
                "full_name": "Fatuma Roba",
                "phone_number": "+251922334455",
                "department": "Electrical Engineering",
                "role": UserRole.USER.value,
                "password": "password123",
            },
            30: {
                "email": "derartutulu@campus.edu",
                "full_name": "Derartu Tulu",
                "phone_number": "+251933445566",
                "department": "Mechanical Engineering",
                "role": UserRole.USER.value,
                "password": "password123",
            },
            28: {
                "email": "kenenisabekele@campus.edu",
                "full_name": "Kenenisa Bekele",
                "phone_number": "+251955667788",
                "department": "Software Engineering",
                "role": UserRole.USER.value,
                "password": "password123",
            },
            25: {
                "email": "hailegebrselassie@campus.edu",
                "full_name": "Haile Gebrselassie",
                "phone_number": "+251944556677",
                "department": "Civil & Environmental Engineering",
                "role": UserRole.USER.value,
                "password": "password123",
            },
        }

        print("\n--- Updating Retained Accounts with Standardized Passwords & Matching Emails ---")
        for u_id, spec in accounts_spec.items():
            user = db.query(User).filter(User.id == u_id).first()
            if not user:
                # If for some reason missing, create it
                user = User(
                    id=u_id,
                    email=spec["email"],
                    password_hash=hash_password(spec["password"]),
                    role=spec["role"],
                    full_name=spec["full_name"],
                    phone_number=spec["phone_number"],
                    department=spec["department"],
                )
                db.add(user)
                print(f" Created missing account {u_id}: {spec['email']}")
            else:
                user.email = spec["email"]
                user.full_name = spec["full_name"]
                user.phone_number = spec["phone_number"]
                user.department = spec["department"]
                user.role = spec["role"]
                user.password_hash = hash_password(spec["password"])
                print(f" Updated account {u_id}: {spec['email']} ({spec['full_name']})")

        db.commit()
        print("\n--- Normalization and Purge Completed Successfully! ---")

        # Verification of active users in DB
        active_users = db.query(User).order_by(User.id.asc()).all()
        print(f"\nFinal active users in DB ({len(active_users)} total):")
        for u in active_users:
            report_count = len(u.reports)
            print(f"  [ID {u.id}] {u.full_name} <{u.email}> - Role: {u.role} - Reports: {report_count}")

    except Exception as e:
        db.rollback()
        print(f"ERROR during normalization: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    normalize_accounts()

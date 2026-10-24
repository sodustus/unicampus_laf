import sys
import os
from collections import defaultdict

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.category import Category
from app.models.report import Report
from app.models.claim import Claim, VerificationRecord
from app.models.recovery import RecoveryRecord


def fix_categories_and_deduplicate():
    db = SessionLocal()
    try:
        print("=== STEP 1: PURGING DUPLICATE ENTRIES ===")
        # Get category lookup map
        categories = {c.name: c.id for c in db.query(Category).all()}
        print(f"Categories in DB: {categories}")

        # 1. Deduplicate by normalized title
        all_reports = db.query(Report).order_by(Report.id.asc()).all()
        by_title = defaultdict(list)
        for r in all_reports:
            norm_title = r.title.strip().lower()
            by_title[norm_title].append(r)

        deleted_duplicates = 0
        for title, reports in by_title.items():
            if len(reports) > 1:
                # Keep the earliest canonical report
                keep = reports[0]
                dups = reports[1:]
                print(f"Duplicate found for '{keep.title}' (keeping ID {keep.id}, deleting {len(dups)} duplicate(s))")
                for dup in dups:
                    # Clean up associated child records
                    dup_claims = db.query(Claim).filter(Claim.report_id == dup.id).all()
                    for c in dup_claims:
                        db.query(VerificationRecord).filter(VerificationRecord.claim_id == c.id).delete()
                        db.query(RecoveryRecord).filter(RecoveryRecord.claim_id == c.id).delete()
                        db.delete(c)
                    db.query(RecoveryRecord).filter(RecoveryRecord.report_id == dup.id).delete()
                    db.delete(dup)
                    deleted_duplicates += 1

        db.commit()
        print(f"Purged {deleted_duplicates} duplicate reports.\n")

        print("=== STEP 2: CATEGORY AUDIT & RE-ALIGNMENT ===")
        import re

        realigned_count = 0
        remaining_reports = db.query(Report).order_by(Report.id.asc()).all()
        for r in remaining_reports:
            text = f"{r.title.lower()} {(r.description or '').lower()}"

            target_category = None
            if re.search(r"\b(backpack|bag|duffel|kanken|tote)\b", text):
                target_category = "Bags & Backpacks"
            elif re.search(r"\b(keycard|key|keys|lanyard|access token)\b", text):
                target_category = "Keys & Access Cards"
            elif re.search(r"\b(wallet|cardholder|purse|coin purse)\b", text):
                target_category = "Wallets & Purses"
            elif re.search(r"\b(student id|transcript|clinic card|id card)\b", text):
                target_category = "Student IDs & Documents"
            elif re.search(r"\b(hoodie|sunglasses|beanie|jacket|sweater|clothing)\b", text):
                target_category = "Clothing & Accessories"
            elif re.search(r"\b(macbook|laptop|dell|hp|ipad|calculator|airpods|earbuds|charger|iphone|headphone|elitebook)\b", text):
                target_category = "Electronics"
            elif re.search(r"\b(calculus|chemistry|notebook|textbook|\bbook\b|binder|moleskine)\b", text):
                target_category = "Books & Stationery"
            elif re.search(r"\b(hydro flask|water bottle|flask|stanley|travel mug|quencher|contigo)\b", text):
                target_category = "Water Bottles & Flasks"
            elif re.search(r"\b(umbrella|glasses|reading glasses|helmet|bicycle)\b", text):
                target_category = "Other Items"

            if target_category and target_category in categories:
                correct_cat_id = categories[target_category]
                if r.category_id != correct_cat_id:
                    old_cat_name = r.category.name if r.category else f"ID {r.category_id}"
                    print(f"Re-aligning ID {r.id} '{r.title}': was [{old_cat_name}] -> now [{target_category}]")
                    r.category_id = correct_cat_id
                    realigned_count += 1

        db.commit()
        print(f"Re-aligned {realigned_count} misplaced reports.\n")

        print("=== STEP 3: FINAL AUDIT & BREAKDOWN BY CATEGORY ===")
        all_categories = db.query(Category).order_by(Category.id.asc()).all()
        for cat in all_categories:
            cat_reports = db.query(Report).filter(Report.category_id == cat.id).order_by(Report.id.asc()).all()
            print(f"\n[{cat.name}] ({len(cat_reports)} reports):")
            for rep in cat_reports:
                print(f"   * #{rep.id}: {rep.title} ({rep.type.upper()}, {rep.status.upper()})")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix_categories_and_deduplicate()

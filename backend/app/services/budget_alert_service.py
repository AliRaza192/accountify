"""Budget Alert Service for monitoring budget thresholds"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timezone
from decimal import Decimal

from app.models.budget import Budget, BudgetLine
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class BudgetAlertService:
    """Service for budget alerts and notifications"""

    DEFAULT_THRESHOLD_PERCENT = 90.0  # Alert when 90% of budget used

    @staticmethod
    def check_budget_alerts(db: Session, company_id: int, threshold_pct: Optional[float] = None) -> List[Dict[str, Any]]:
        """Check all budgets and return alerts for exceeded thresholds"""
        threshold = threshold_pct or BudgetAlertService.DEFAULT_THRESHOLD_PERCENT
        alerts = []

        budgets = db.query(Budget).filter(
            Budget.company_id == company_id,
            Budget.status == "active"
        ).all()

        current_month = datetime.now(timezone.utc).month
        month_names = ["jan", "feb", "mar", "apr", "may", "jun",
                       "jul", "aug", "sep", "oct", "nov", "dec"]
        current_month_col = month_names[current_month - 1]

        for budget in budgets:
            for line in budget.lines:
                budgeted = float(line.total or 0)
                if budgeted <= 0:
                    continue

                # Get actual spend from current month column
                actual = float(getattr(line, current_month_col, 0) or 0)
                utilization_pct = (actual / budgeted) * 100

                if utilization_pct >= threshold:
                    alerts.append({
                        "budget_id": budget.id,
                        "budget_name": budget.name,
                        "account_id": line.account_id,
                        "account_name": f"Account {line.account_id}",  # Resolve from account model
                        "budgeted": budgeted,
                        "actual": actual,
                        "variance_pct": round(utilization_pct, 1),
                        "threshold": threshold,
                        "month": current_month
                    })

        return alerts

    @staticmethod
    def send_alert_emails(db: Session, alerts: List[Dict[str, Any]], recipient_emails: List[str]) -> int:
        """Send alert emails for budget threshold violations"""
        sent_count = 0

        for alert in alerts:
            for recipient_email in recipient_emails:
                success = EmailService.send_budget_alert(
                    to_email=recipient_email,
                    budget_name=alert["budget_name"],
                    account_name=alert["account_name"],
                    budgeted=alert["budgeted"],
                    actual=alert["actual"],
                    variance_pct=alert["variance_pct"]
                )
                if success:
                    sent_count += 1

        logger.info(f"Sent {sent_count} budget alert emails")
        return sent_count

    @staticmethod
    def get_budget_health(db: Session, budget_id: int) -> Dict[str, Any]:
        """Get overall budget health summary"""
        budget = db.query(Budget).filter(Budget.id == budget_id).first()
        if not budget:
            return {"error": "Budget not found"}

        current_month = datetime.now(timezone.utc).month
        month_names = ["jan", "feb", "mar", "apr", "may", "jun",
                       "jul", "aug", "sep", "oct", "nov", "dec"]

        summary = {
            "budget_id": budget_id,
            "budget_name": budget.name,
            "fiscal_year": budget.fiscal_year,
            "status": budget.status,
            "total_budget": 0,
            "total_actual_ytd": 0,
            "lines": [],
            "alerts": []
        }

        for line in budget.lines:
            total = float(line.total or 0)
            ytd_actual = sum(float(getattr(line, m, 0) or 0) for m in month_names[:current_month])

            summary["total_budget"] += total
            summary["total_actual_ytd"] += ytd_actual

            utilization = (ytd_actual / total * 100) if total > 0 else 0

            line_summary = {
                "account_id": line.account_id,
                "budgeted": total,
                "actual_ytd": round(ytd_actual, 2),
                "utilization_pct": round(utilization, 1),
                "status": "critical" if utilization > 100 else "warning" if utilization > 90 else "healthy"
            }
            summary["lines"].append(line_summary)

            if utilization > 90:
                summary["alerts"].append(line_summary)

        summary["total_budget"] = round(summary["total_budget"], 2)
        summary["total_actual_ytd"] = round(summary["total_actual_ytd"], 2)

        return summary

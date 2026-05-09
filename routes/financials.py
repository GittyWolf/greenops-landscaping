from models.db import Job, Expense
from datetime import datetime, timedelta

def calculate_job_profit(revenue, labor_hours, hourly_rate, materials, fuel_cost):
    labor_cost = labor_hours * hourly_rate
    total_expenses = labor_cost + materials + fuel_cost
    profit = revenue - total_expenses
    margin = (profit / revenue * 100) if revenue else 0
    return {
        "revenue": round(revenue, 2),
        "labor_cost": round(labor_cost, 2),
        "materials_cost": round(materials, 2),
        "fuel_cost": round(fuel_cost, 2),
        "total_expenses": round(total_expenses, 2),
        "profit": round(profit, 2),
        "margin_pct": round(margin, 2),
    }

def get_monthly_summary(month=None, hourly_rate=25.0):
    job_query = Job.query
    expense_query = Expense.query
    if month:
        job_query = job_query.filter(Job.date.startswith(month))
        expense_query = expense_query.filter(Expense.date.startswith(month))
    jobs = job_query.all()
    expenses = expense_query.all()
    total_revenue = sum(j.revenue for j in jobs)
    total_labor_cost = sum(j.labor_hours * hourly_rate for j in jobs)
    total_materials = sum(j.materials_cost for j in jobs)
    total_fuel = sum(j.fuel_cost for j in jobs)
    total_other_expenses = sum(e.amount for e in expenses)
    total_expenses = total_labor_cost + total_materials + total_fuel + total_other_expenses
    net_profit = total_revenue - total_expenses
    net_margin = (net_profit / total_revenue * 100) if total_revenue else 0
    job_breakdown = []
    for j in jobs:
        p = calculate_job_profit(j.revenue, j.labor_hours, hourly_rate, j.materials_cost, j.fuel_cost)
        p.update({"job_id": j.id, "client": j.client_name, "address": j.address, "date": j.date, "status": j.status})
        job_breakdown.append(p)
    expense_by_category = {}
    for e in expenses:
        expense_by_category[e.category] = expense_by_category.get(e.category, 0) + e.amount
    return {
        "month": month or "all_time",
        "total_jobs": len(jobs),
        "total_revenue": round(total_revenue, 2),
        "total_labor_cost": round(total_labor_cost, 2),
        "total_materials": round(total_materials, 2),
        "total_fuel_from_jobs": round(total_fuel, 2),
        "total_other_expenses": round(total_other_expenses, 2),
        "total_expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "net_margin_pct": round(net_margin, 2),
        "expense_by_category": {k: round(v, 2) for k, v in expense_by_category.items()},
        "job_breakdown": sorted(job_breakdown, key=lambda x: x["profit"], reverse=True),
    }

def get_weekly_summary(date_str=None, hourly_rate=25.0):
    if date_str:
        ref = datetime.strptime(date_str, "%Y-%m-%d")
    else:
        ref = datetime.utcnow()
    start = ref - timedelta(days=ref.weekday())
    days = []
    for i in range(7):
        day = start + timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        day_jobs = Job.query.filter(Job.date == day_str).all()
        day_expenses = Expense.query.filter(Expense.date == day_str).all()
        revenue = sum(j.revenue for j in day_jobs)
        labor_cost = sum(j.labor_hours * hourly_rate for j in day_jobs)
        materials = sum(j.materials_cost for j in day_jobs)
        fuel = sum(j.fuel_cost for j in day_jobs)
        other = sum(e.amount for e in day_expenses)
        total_expenses = labor_cost + materials + fuel + other
        profit = revenue - total_expenses
        margin = (profit / revenue * 100) if revenue else 0
        days.append({
            "date": day_str,
            "day": day.strftime("%a"),
            "revenue": round(revenue, 2),
            "total_expenses": round(total_expenses, 2),
            "profit": round(profit, 2),
            "margin_pct": round(margin, 2),
            "job_count": len(day_jobs),
        })
    return {
        "week_start": start.strftime("%Y-%m-%d"),
        "week_end": (start + timedelta(days=6)).strftime("%Y-%m-%d"),
        "days": days,
        "total_revenue": round(sum(d["revenue"] for d in days), 2),
        "total_profit": round(sum(d["profit"] for d in days), 2),
    }

def get_monthly_report(month_str=None, hourly_rate=25.0):
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    month_jobs = Job.query.filter(Job.date.startswith(month_str)).all()
    month_expenses = Expense.query.filter(Expense.date.startswith(month_str)).all()

    weeks = {}
    for j in month_jobs:
        if not j.date:
            continue
        day = datetime.strptime(j.date, "%Y-%m-%d")
        wk = (day - timedelta(days=day.weekday())).strftime("%Y-%m-%d")
        if wk not in weeks:
            weeks[wk] = {"jobs": [], "expenses": []}
        weeks[wk]["jobs"].append(j)
    for e in month_expenses:
        if not e.date:
            continue
        day = datetime.strptime(e.date, "%Y-%m-%d")
        wk = (day - timedelta(days=day.weekday())).strftime("%Y-%m-%d")
        if wk not in weeks:
            weeks[wk] = {"jobs": [], "expenses": []}
        weeks[wk]["expenses"].append(e)

    weekly_breakdown = []
    for wk, data in sorted(weeks.items()):
        revenue = sum(j.revenue for j in data["jobs"])
        labor_cost = sum(j.labor_hours * hourly_rate for j in data["jobs"])
        materials = sum(j.materials_cost for j in data["jobs"])
        fuel = sum(j.fuel_cost for j in data["jobs"])
        other = sum(e.amount for e in data["expenses"])
        total_expenses = labor_cost + materials + fuel + other
        profit = revenue - total_expenses
        margin = (profit / revenue * 100) if revenue else 0
        weekly_breakdown.append({
            "week_start": wk,
            "label": "Wk " + wk[5:],
            "revenue": round(revenue, 2),
            "total_expenses": round(total_expenses, 2),
            "profit": round(profit, 2),
            "margin_pct": round(margin, 2),
            "job_count": len(data["jobs"]),
            "below_20pct_margin": margin < 20 and revenue > 0,
        })

    all_jobs_with_margin = []
    for j in month_jobs:
        p = calculate_job_profit(j.revenue, j.labor_hours, hourly_rate, j.materials_cost, j.fuel_cost)
        p.update({"job_id": j.id, "client": j.client_name, "date": j.date})
        all_jobs_with_margin.append(p)
    all_jobs_with_margin.sort(key=lambda x: x["margin_pct"], reverse=True)

    expense_by_category = {}
    for e in month_expenses:
        expense_by_category[e.category] = expense_by_category.get(e.category, 0) + e.amount

    total_revenue = sum(j.revenue for j in month_jobs)
    job_costs = sum(j.labor_hours * hourly_rate + j.materials_cost + j.fuel_cost for j in month_jobs)
    other_costs = sum(e.amount for e in month_expenses)
    total_profit = total_revenue - job_costs - other_costs

    return {
        "month": month_str,
        "weekly_breakdown": weekly_breakdown,
        "top_jobs": all_jobs_with_margin[:3],
        "bottom_jobs": all_jobs_with_margin[-3:] if len(all_jobs_with_margin) > 3 else [],
        "expense_by_category": {k: round(v, 2) for k, v in expense_by_category.items()},
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
    }

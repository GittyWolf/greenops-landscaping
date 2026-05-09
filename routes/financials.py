from models.db import Job, Expense

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

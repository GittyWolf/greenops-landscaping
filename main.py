from flask import Flask, jsonify, request
from flask_cors import CORS
from routes.optimize import optimize_route
from routes.financials import calculate_job_profit, get_monthly_summary
from agents.claude_agent import ask_claude
from models.db import db, Job, Expense, Client
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///landscaping.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route("/api/optimize-route", methods=["POST"])
def route_optimizer():
    data = request.json
    start = data.get("start_address")
    stops = data.get("job_addresses", [])
    current_location = data.get("current_location")
    if not stops:
        return jsonify({"error": "No job addresses provided"}), 400
    result = optimize_route(stops, start, current_location)
    return jsonify(result)

@app.route("/api/jobs", methods=["GET", "POST"])
def jobs():
    if request.method == "POST":
        data = request.json
        job = Job(
            client_name=data["client_name"],
            address=data["address"],
            revenue=data["revenue"],
            labor_hours=data.get("labor_hours", 0),
            materials_cost=data.get("materials_cost", 0),
            fuel_cost=data.get("fuel_cost", 0),
            date=data.get("date"),
            status=data.get("status", "scheduled"),
            lat=data.get("lat"),
            lng=data.get("lng"),
        )
        db.session.add(job)
        db.session.commit()
        return jsonify(job.to_dict()), 201
    jobs_list = Job.query.order_by(Job.date.desc()).all()
    return jsonify([j.to_dict() for j in jobs_list])

@app.route("/api/jobs/<int:job_id>", methods=["GET", "PUT", "DELETE"])
def job_detail(job_id):
    job = Job.query.get_or_404(job_id)
    if request.method == "GET":
        return jsonify(job.to_dict())
    if request.method == "PUT":
        data = request.json
        for key, val in data.items():
            setattr(job, key, val)
        db.session.commit()
        return jsonify(job.to_dict())
    if request.method == "DELETE":
        db.session.delete(job)
        db.session.commit()
        return jsonify({"deleted": True})

@app.route("/api/financials/job/<int:job_id>", methods=["GET"])
def job_financials(job_id):
    job = Job.query.get_or_404(job_id)
    hourly_rate = float(request.args.get("hourly_rate", 25))
    result = calculate_job_profit(
        revenue=job.revenue,
        labor_hours=job.labor_hours,
        hourly_rate=hourly_rate,
        materials=job.materials_cost,
        fuel_cost=job.fuel_cost,
    )
    return jsonify(result)

@app.route("/api/financials/summary", methods=["GET"])
def monthly_summary():
    month = request.args.get("month")
    hourly_rate = float(request.args.get("hourly_rate", 25))
    summary = get_monthly_summary(month, hourly_rate)
    return jsonify(summary)

@app.route("/api/expenses", methods=["GET", "POST"])
def expenses():
    if request.method == "POST":
        data = request.json
        exp = Expense(
            description=data["description"],
            amount=data["amount"],
            category=data.get("category", "general"),
            date=data.get("date"),
        )
        db.session.add(exp)
        db.session.commit()
        return jsonify(exp.to_dict()), 201
    return jsonify([e.to_dict() for e in Expense.query.order_by(Expense.date.desc()).all()])

@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.json
    question = data.get("question", "")
    month = data.get("month")
    hourly_rate = float(data.get("hourly_rate", 25))
    summary = get_monthly_summary(month, hourly_rate)
    recent_jobs = [j.to_dict() for j in Job.query.order_by(Job.date.desc()).limit(10).all()]
    recent_expenses = [e.to_dict() for e in Expense.query.order_by(Expense.date.desc()).limit(10).all()]
    context = {
        "monthly_summary": summary,
        "recent_jobs": recent_jobs,
        "recent_expenses": recent_expenses,
    }
    answer = ask_claude(question, context)
    return jsonify({"answer": answer})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", debug=False, port=port)

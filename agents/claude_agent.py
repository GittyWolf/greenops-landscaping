import requests
import json
import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
API_URL = "https://api.anthropic.com/v1/messages"

SYSTEM_PROMPT = """You are a sharp, practical business assistant for a small landscaping operation.
You have access to real-time data including monthly financials, weekly daily breakdowns, and expense details.

Key things to watch for and flag proactively:
- Any week with margin below 20% — call it out by week date and suggest a fix
- Jobs with the lowest margins — identify what's eating into profit (labor, materials, or fuel)
- Expense categories that are unusually high compared to revenue
- Weeks or days with zero revenue that should have had jobs

Answer questions clearly and concisely — the owner is often on the job site reading on a phone.
Give one concrete, actionable recommendation at the end of each response.
Always be direct. No fluff. Use plain numbers, not vague language."""

def ask_claude(user_message: str, context: dict) -> str:
    context_block = json.dumps(context, indent=2)
    prompt = f"Business data:\n{context_block}\n\nQuestion: {user_message}"
    try:
        response = requests.post(
            API_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["content"][0]["text"]
    except requests.exceptions.ConnectionError:
        return "⚠️ Could not reach the Anthropic API. Check your internet connection."
    except requests.exceptions.Timeout:
        return "⚠️ Request timed out. Please try again."
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

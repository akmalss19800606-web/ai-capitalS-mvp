import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

def get_investment_recommendation(asset_name: str, asset_symbol: str, current_price: float, portfolio_value: float) -> str:
    prompt = f"Asset: {asset_name} ({asset_symbol}), Price: ${current_price}, Portfolio: ${portfolio_value}. Give BUY/SELL/HOLD with 2 sentence reason."
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are a professional investment advisor. Be concise."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=200
    )
    return response.choices[0].message.content

def get_groq_client():
    from openai import OpenAI
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

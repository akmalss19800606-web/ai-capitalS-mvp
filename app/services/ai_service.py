import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_investment_recommendation(
    asset_name: str,
    asset_symbol: str,
    current_price: float,
    portfolio_value: float
) -> str:
    prompt = f"""
You are an expert investment advisor. Analyze the following asset and provide a brief recommendation.

Asset: {asset_name} ({asset_symbol})
Current Price: 
Portfolio Total Value: 

Provide a concise recommendation: BUY, SELL, or HOLD with a brief explanation (2-3 sentences).
Focus on risk management and diversification.
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a professional investment advisor."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=150,
        temperature=0.7
    )
    return response.choices[0].message.content

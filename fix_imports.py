with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'from app.database import get_db',
    'from app.api.v1.deps import get_db'
)
content = content.replace(
    'from app.auth import get_current_user',
    'from app.api.v1.deps import get_current_user'
)

with open('backend/app/routers/market_analysis.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Imports fixed!')

with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Найдём и покажем все импорты из app.database
import re
for m in re.finditer(r'from app\..+? import .+', content):
    print(m.group())

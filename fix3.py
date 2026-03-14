with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Строки 174-176 (индексы 173-175): заменяем на одну строку
lines[173:176] = [
    '        paragraphs = [p.strip() for p in text.split("\\n\\n") if p.strip()]\n',
]

with open('backend/app/routers/market_analysis.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed line 174!')

with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Строки 366-367 (индексы 365-366): заменяем на одну
lines[365:367] = [
    '            story.append(Paragraph(section["content"][:2000].replace("\\n", "<br/>"), styles["Normal"]))\n',
]

with open('backend/app/routers/market_analysis.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed!')

with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Покажем строки 363-372
for i in range(362, 372):
    if i < len(lines):
        print(f'{i+1}: {repr(lines[i])}')

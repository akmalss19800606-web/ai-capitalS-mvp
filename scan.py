with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '"\n' in line and line.strip().startswith(('r"', '"', "'")):
        print(f'{i+1}: {repr(line)}')
    # Ищем строки внутри строковых литералов с голым переносом
    if line.rstrip('\n') and not line.rstrip('\n')[-1] in ('\\', ',', '[', ']', '(', ')', '{', '}', ':', '#') and i > 0:
        prev = lines[i-1].rstrip('\n')
        if prev and prev[-1] not in ('\\\\', ',', '[', '(', '{'):
            pass

# Проще - найдём все строки где есть незакрытый строковый литерал
# Покажем строки 170-185
for i in range(169, 185):
    if i < len(lines):
        print(f'{i+1}: {repr(lines[i])}')

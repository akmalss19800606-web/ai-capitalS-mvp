with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Найдём все строки где строковый литерал обрывается на конце строки
# (признак: нечётное число кавычек + нет закрывающей на той же строке)
problems = []
for i, line in enumerate(lines):
    stripped = line.rstrip('\n')
    # Ищем паттерн: .split(" или .replace(" или похожее где строка не закрыта
    if stripped.endswith(('"', "\"")) == False:
        # Считаем незакрытые кавычки грубо
        in_str = False
        for j, ch in enumerate(stripped):
            if ch == '"' and (j == 0 or stripped[j-1] != '\\'):
                in_str = not in_str
        if in_str:
            problems.append(i)
            print(f'Line {i+1}: {repr(stripped)}')

print(f'Total problems: {len(problems)}')

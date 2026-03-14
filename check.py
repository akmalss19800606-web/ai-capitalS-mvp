with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Найдём строку с проблемным patterns = [
start = None
end = None
for i, line in enumerate(lines):
    if 'patterns = [' in line and start is None:
        start = i
    if start is not None and i > start and line.strip() == ']':
        end = i
        break

print(f'Found block: lines {start+1} to {end+1}')
for i in range(start, end+1):
    print(f'{i+1}: {repr(lines[i])}')

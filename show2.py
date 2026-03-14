import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
path = "frontend/app/market-analysis/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines[44:], 45):
    print(f"{i:3d}| {line.rstrip()}")

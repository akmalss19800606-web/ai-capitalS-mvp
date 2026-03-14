path = "frontend/app/market-analysis/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()
total = len(lines)
print(f"Total lines: {total}")
# Показываем всё
for i, line in enumerate(lines, 1):
    print(f"{i:3d}| {line.rstrip()}")

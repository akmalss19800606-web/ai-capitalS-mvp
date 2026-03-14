path = "frontend/app/market-analysis/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Показываем строки с macro, undefined, header, preview, sidebar, summary
keywords = ["macro", "undefined", "header", "preview", "sidebar", "summary", "sector_id", "generate-report", "apiCall"]
for i, line in enumerate(lines, 1):
    low = line.lower()
    if any(k in low for k in keywords):
        print(f"{i}: {line.rstrip()[:120]}")

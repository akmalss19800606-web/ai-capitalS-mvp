import sys
path = "frontend/components/Sidebar.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()
count = text.count("/uz-market")
print(f"Found {count} occurrences of /uz-market")
text2 = text.replace("/uz-market", "/market-analysis", 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(text2)
print("Replaced OK")

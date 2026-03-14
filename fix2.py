with open('backend/app/routers/market_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_block = [
    '    patterns = [\n',
    '        r"(?:(?:^|\\n)(?:#{1,3}\\s*)?(\\d+)[\\.:\\)]\\s+([A-ZА-Я][^\\n]{3,60})\\n(.*?)(?=\\n\\d+[\\.:\\)]|\\Z))",\n',
    '    ]\n',
]

lines[162:169] = new_block

with open('backend/app/routers/market_analysis.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed!')

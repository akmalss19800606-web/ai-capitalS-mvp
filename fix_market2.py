
import re

path = 'frontend/app/market-analysis/page.tsx'
with open(path, 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8')

def fix_match(m):
    s = m.group(1)
    try:
        fixed = s.encode('latin-1').decode('utf-8')
        if fixed != s:
            return chr(34) + fixed + chr(34)
    except:
        pass
    return m.group(0)

pattern = chr(34) + '(' + '[^' + chr(34) + ']*?' + '[\x80-\xff]' + '[^' + chr(34) + ']*?)' + chr(34)
fixed = re.sub(pattern, fix_match, text)

changed = sum(1 for a,b in zip(text, fixed) if a != b)
print(f'Changed {changed} chars')

if changed > 0:
    with open(path, 'w', encoding='utf-8', newline=chr(10)) as f:
        f.write(fixed)
    print('Saved OK')
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    idx = t.find('OKED_SECTIONS')
    if idx >= 0:
        print('Preview:', t[idx+18:idx+200])
else:
    print('Latin-1 trick failed')
    idx = text.find('OKED_SECTIONS')
    if idx >= 0:
        chunk = text[idx+18:idx+120]
        print('Raw hex of first name:')
        for c in chunk[:60]:
            if ord(c) > 127:
                print(f'  U+{ord(c):04X} = {c}', end='')
        print()
        print('Sample:', repr(chunk[:80]))

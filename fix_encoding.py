import glob

files = []
for pattern in ['frontend/app/**/*.tsx', 'frontend/app/**/*.ts', 'frontend/components/**/*.tsx', 'frontend/components/**/*.ts', 'frontend/lib/**/*.ts', 'frontend/hooks/**/*.ts', 'frontend/src/**/*.tsx']:
    files.extend(glob.glob(pattern, recursive=True))

fixed = 0
for f in files:
    try:
        with open(f, 'rb') as fh:
            raw = fh.read()
        text = raw.decode('utf-8')
        if '\u0420' in text or '\u0421' in text:
            fixed_text = text.encode('latin-1').decode('cp1251')
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write(fixed_text)
            print('Fixed:', f)
            fixed += 1
    except:
        pass

print('Total fixed:', fixed)

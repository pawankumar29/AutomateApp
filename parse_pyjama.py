import re

with open('pyjama_after_click.html', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'easyApplyFieldFocus', html)
if m:
    tail = html[m.start():]
    btns = re.findall(r'<button[^>]*>.*?</button>', tail, re.DOTALL | re.IGNORECASE)
    print(f'Buttons after easyApply: {len(btns)}')
    for i, b in enumerate(btns[:10]):
        t = re.sub(r'<[^>]+>', ' ', b).strip()
        print(f'{i+1}: {t}')
        print(f'Snippet: {b[:150]}')

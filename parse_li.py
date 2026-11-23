import re

with open('li_search.html', encoding='utf-8') as f:
    html = f.read()

btns = re.findall(r'<button[^>]*>.*?</button>', html, re.DOTALL | re.IGNORECASE)
print("BUTTON 29:\n", btns[28])

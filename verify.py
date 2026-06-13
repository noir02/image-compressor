import re

with open('index.html', 'r', encoding='utf-8') as f: html_text = f.read()
with open('app.js', 'r', encoding='utf-8') as f: js_text = f.read()
with open('styles.css', 'r', encoding='utf-8') as f: css_text = f.read()

# 1. JS brace balance
def balance(s):
    pairs = {'(': ')', '[': ']', '{': '}'}
    rev = {v: k for k, v in pairs.items()}
    stack, i = [], 0
    in_str = None
    while i < len(s):
        c = s[i]
        nx = s[i+1] if i+1 < len(s) else ''
        if in_str:
            if c == '\\': i += 2; continue
            if c == in_str: in_str = None
            i += 1; continue
        if c == '/' and nx == '/':
            while i < len(s) and s[i] != '\n': i += 1
            continue
        if c == '/' and nx == '*':
            i += 2
            while i < len(s) - 1 and not (s[i] == '*' and s[i+1] == '/'): i += 1
            i += 2; continue
        if c in ('"', "'"):
            in_str = c; i += 1; continue
        if c == '`':
            i += 1
            while i < len(s) and s[i] != '`':
                if s[i] == '\\': i += 2; continue
                i += 1
            i += 1; continue
        if c in pairs: stack.append(c)
        elif c in rev:
            if not stack: return (False, f"unmatched {c} at {i}")
            if stack[-1] != rev[c]: return (False, f"mismatch {c} at {i}")
            stack.pop()
        i += 1
    if stack: return (False, f"unclosed {[c for c in stack]}")
    return (True, "ok")

print("1) app.js brace/paren/bracket:", balance(js_text))

# 2. ID cross-check
ids_js = set(re.findall(r"\$\('([^']+)'\)", js_text))
ids_js |= set(re.findall(r"getElementById\('([^']+)'\)", js_text))
ids_html = set(re.findall(r'id="([^"]+)"', html_text))
print(f"2) JS refs {len(ids_js)} ids; missing in HTML: {sorted(ids_js - ids_html) or 'none'}")

# 3. Class cross-check
classes = set()
for m in re.findall(r"classList\.(?:add|remove|toggle)\((['\"])([^'\"]+)\1", js_text):
    classes.update(m[1].split())
for m in re.findall(r"className\s*=\s*['\"]([^'\"]+)['\"]", js_text):
    classes.update(m.split())
missing_classes = [c for c in classes if not re.search(r'\.' + re.escape(c) + r'\b', css_text)]
print(f"3) JS uses {len(classes)} classes; not in CSS: {missing_classes or 'none'}")

# 4. Asset references
print("4) scripts:", re.findall(r'<script[^>]*src="([^"]+)"', html_text))
print("   stylesheets:", re.findall(r'<link[^>]*href="([^"]+)"', html_text))
print("   local files exist:")
import os
for tag in re.findall(r'<script[^>]*src="([^"]+)"', html_text) + re.findall(r'<link[^>]*href="([^"]+)"', html_text):
    if tag.startswith(('http://', 'https://', '//')): print(f"      [CDN] {tag}"); continue
    print(f"      [{'OK' if os.path.isfile(tag) else 'MISSING'}] {tag}")

# 5. Spot-check key plan behaviours
must_have = {
    'serial queue (busy flag)': r'state\.busy\s*=\s*true',
    'URL.revokeObjectURL on remove': r'URL\.revokeObjectURL',
    'requeueAll on settings change': r'requeueAll',
    # Lossless: upngEncode(file, 0) is wrapped in try/catch; failure falls through
    'UPNG lossless wrapped in try/catch':
        r"try\s*\{[\s\S]{0,200}?upngEncode\([^)]+,\s*0\s*\)",
    # Lossy PNG no longer goes through UPNG; canvas path passes undefined quality
    'PNG ignores quality arg (lossy uses canvas)':
        r"out\.type\s*===\s*['\"]image/png['\"]\s*\?\s*undefined",
    'jpeg white fill on transparent': r"ctx\.fillStyle\s*=\s*['\"]#ffffff['\"]",
    'JSZip usage': r'new JSZip',
    'ZIP filename rule': r'-min\.',
    'image>4000 toast': r'> 4000',
    'size warn 50MB': r'50\s*\*\s*1024\s*\*\s*1024',
    'theme toggle': r"data-theme",
    'webp support detection': r"image/webp",
    'whitelist jpeg/png/webp': r"image/(?:jpeg|png|webp)",
    'theme persistence': r"localStorage\.getItem\('theme'\)",
    'drag counter for nested elements': r"dragCounter",
    'confirm dialog for large files': r"confirmDialog",
    'PNG strategy radio group': r'png-strategy',
}
print("5) Plan feature presence:")
for name, pat in must_have.items():
    found = bool(re.search(pat, js_text))
    print(f"   [{'OK' if found else 'MISS'}] {name}")

print()
print("6) Regression: things that must NOT come back:")
must_not_have = {
    'No bare UPNG.encode(..., 256) (lossy must use canvas)':
        r"UPNG\.encode\([^,]+,\s*[^,]+,\s*[^,]+,\s*256\s*\)",
    'No PNG_QUANTIZE_COLORS constant (unused after lossy refactor)':
        r"PNG_QUANTIZE_COLORS",
}
for name, pat in must_not_have.items():
    found = bool(re.search(pat, js_text))
    print(f"   [{'REGRESSION' if found else 'OK'}] {name}")

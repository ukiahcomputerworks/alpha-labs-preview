"""Install/check the shared footer without rewriting unrelated markup. No runtime dependencies."""
import argparse
import json
from pathlib import Path
import re
import subprocess

START = '<!-- CWU COLOPHON START -->'
END = '<!-- CWU COLOPHON END -->'
LINK = re.compile(r'<link\b[^>]*data-cwu-colophon[^>]*>\s*', re.I)
BLOCK = re.compile(r'\n?' + re.escape(START) + r'.*?' + re.escape(END) + r'\s*', re.S)

def pages(root):
    tracked = subprocess.run(['git', '-C', str(root), 'ls-files', '--cached', '--others', '--exclude-standard', '*.html'], capture_output=True, text=True, check=True).stdout.splitlines()
    return [root / name for name in sorted(set(tracked)) if not any(part in {'source', '.deps', 'node_modules', 'captures', 'scripts', 'templates'} for part in Path(name).parts)]

def apply(root, check=False):
    root = Path(root)
    config = json.loads((root / 'site-colophon.json').read_text(encoding='utf-8'))
    template = (root / 'scripts' / 'colophon.html').read_text(encoding='utf-8').strip()
    if not config.get('preview', True):
        template = template.replace('  <span class="cwu-colophon-status">Independent Website Preview</span>\n', '')
    rendered = skipped = changed = 0
    failures = []
    for path in pages(root):
        original = path.read_text(encoding='utf-8-sig')
        if re.search(r'<meta\b[^>]*http-equiv\s*=\s*[\"\x27]?refresh', original, re.I):
            skipped += 1
            continue
        rendered += 1
        prefix = '../' * (len(path.relative_to(root).parts) - 1)
        csslink = '<link rel="stylesheet" href="' + prefix + 'assets/cwu-colophon.css" data-cwu-colophon="true">'
        if check:
            if original.count('id="cwu-colophon"') != 1 or original.count(START) != 1 or csslink not in original or 'href="https://computerworks.ai/"' not in original:
                failures.append(str(path.relative_to(root)))
            continue
        text = LINK.sub('', BLOCK.sub('', original))
        text = re.sub(r'Independent design review\s*(?:&middot;|&#183;|.)\s*Source photo credit:', 'Source photo credit:', text)
        text = re.sub(r'</head\s*>', csslink + '\n</head>', text, count=1, flags=re.I)
        if re.search(r'</footer\s*>', text, re.I):
            # Last footer is the site's bottom footer, not a nested article footer.
            matches = list(re.finditer(r'</footer\s*>', text, re.I))
            match = matches[-1]
            text = text[:match.start()] + '\n' + template + '\n' + text[match.start():]
        else:
            text = re.sub(r'</body\s*>', '<footer class="cwu-preview-footer">\n' + template + '\n</footer>\n</body>', text, count=1, flags=re.I)
        if text != original:
            path.write_text(text, encoding='utf-8')
            changed += 1
    if failures:
        raise SystemExit('Colophon check failed: ' + ', '.join(failures))
    result = dict(rendered=rendered, redirects=skipped, changed=changed, checked=check)
    print(json.dumps(result))
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    apply(args.root, args.check)

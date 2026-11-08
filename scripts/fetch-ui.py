"""Vendor official shadcn-svelte registry sources (registry source with native Kit 3 imports)."""
import json, pathlib, subprocess, re
root = pathlib.Path(__file__).resolve().parents[1] / 'site/src/lib'
for name in 'table tabs input button badge accordion dialog tooltip progress'.split():
    raw = subprocess.check_output(['curl', '-fsSL', f'https://shadcn-svelte.com/registry/styles/vega/{name}.json'])
    item = json.loads(raw)
    for f in item['files']:
        target = root / 'components/ui' / name / pathlib.Path(f['target']).name
        target.parent.mkdir(parents=True, exist_ok=True)
        content = f['content'].replace('$UTILS$', '#lib/utils').replace('$LIB$', '#lib').replace('$UI$', '#lib/components/ui').replace('$COMPONENTS$', '#lib/components').replace('$HOOKS$', '#lib/hooks')
        icons = set()
        def replace_icon(match):
            attrs = match[1]
            icon = re.search(r'lucide="([^"]+)"', attrs)[1]
            icons.add(icon)
            attrs = re.sub(r'\s*(?:lucide|tabler|hugeicons|phosphor|remixicon)="[^"]*"', '', attrs)
            return '<' + icon + ' ' + attrs + '/>'
        content = re.sub(r'<IconPlaceholder\s+([\s\S]*?)/>', replace_icon, content)
        if icons:
            content = re.sub(r'import IconPlaceholder from .*?;', 'import { ' + ', '.join(sorted(icons)) + ' } from "@lucide/svelte";', content)
        target.write_text(content)
    print(name, item.get('dependencies', []), item.get('devDependencies', []), item.get('registryDependencies', []))

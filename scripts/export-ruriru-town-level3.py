#!/usr/bin/env python3
"""Export the speech activity as one HTML file, including map, sprites and SFX.

The UI and assets work locally; browser speech recognition may require internet.
Usage: python scripts/export-ruriru-town-level3.py /absolute/output.html
"""
import base64
import json
import mimetypes
import re
import sys
from pathlib import Path


def export(output: Path) -> None:
    games = Path(__file__).resolve().parents[1] / 'games'
    html = (games / 'ruriru-town-level3.html').read_text(encoding='utf-8')

    def data(path: Path) -> str:
        mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

    sprites = {
        f'{direction}-{frame}': data(games / f'assets/ruriru-town/characters/{direction}-{frame}.png')
        for direction in ('north', 'east', 'south', 'west') for frame in range(4)
    }

    def inline_script(match: re.Match) -> str:
        source = match.group(1).split('?')[0]
        script = (games / source).read_text(encoding='utf-8')
        if source == 'ruriru-town-level3.js':
            script = script.replace(
                'const spriteUrl=(dir,frame)=>`assets/ruriru-town/characters/${directions[dir]}-${frame}.png`;',
                'const embeddedSprites=' + json.dumps(sprites) + ';\n'
                ' const spriteUrl=(dir,frame)=>embeddedSprites[`${directions[dir]}-${frame}`];',
            )
        return '<script>\n' + script.replace('</script', '<\\/script') + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
                  lambda match: '<style>\n' + (games / match.group(1).split('?')[0]).read_text(encoding='utf-8') + '\n</style>', html)
    # Deferred external scripts originally run after parsing the document.
    # Keep that order when inlining by moving them to the end of the body.
    scripts = ''.join(inline_script(match) for match in re.finditer(r'<script src="([^"]+)" defer></script>', html))
    html = re.sub(r'<script src="([^"]+)" defer></script>', '', html)
    html = re.sub(r'src="(assets/[^"]+)"', lambda match: 'src="' + data(games / match.group(1)) + '"', html)
    html = html.replace('</body>', scripts + '\n</body>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    print(json.dumps({'file': str(output), 'bytes': output.stat().st_size}))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: export-ruriru-town-level3.py /absolute/output.html')
    export(Path(sys.argv[1]).resolve())

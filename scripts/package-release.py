"""Create importable source and compact PNG previews; do not include local credentials."""
from pathlib import Path
import argparse, hashlib, json, shutil, zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT.parent / 'scratch/yuanxiang_red_app_release')
args = parser.parse_args()
OUT = args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
PREVIEW = ROOT / 'docs/preview'
excluded = {'.git', '.agents', '.aws', '.codex', '__pycache__', 'node_modules', '.pytest_cache'}
source_files = [p for p in ROOT.rglob('*') if p.is_file()
                and not excluded.intersection(p.relative_to(ROOT).parts)
                and p.suffix not in {'.pyc', '.log', '.zip'}
                and not p.name.startswith('.env')
                and OUT not in p.parents]
source_name = 'yuanxiang-red-wxapp-source.zip'
preview_name = 'yuanxiang-red-layout-preview.zip'
with zipfile.ZipFile(OUT / source_name, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(source_files):
        z.write(p, 'yuanxiang-red-wxapp/' + p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(OUT / preview_name, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(PREVIEW.rglob('*')):
        if p.is_file() and p.suffix in {'.png', '.json', '.md'}:
            z.write(p, 'yuanxiang-red-layout-preview/' + p.relative_to(PREVIEW).as_posix())
for name in ['README.md', 'RELEASE_NOTES.md']:
    shutil.copy2(ROOT / name, OUT / name)
shutil.copy2(PREVIEW / 'overview.png', OUT / 'overview.png')
report = json.loads((ROOT / 'scripts/validation-report.json').read_text())
tests = json.loads((ROOT / 'scripts/test-report.json').read_text())
assert report['status'] == 'passed' and tests['status'] == 'passed'
manifest = {'registeredPages': report['counts']['pages'], 'behaviorTests': tests,
            'sourceChecks': report,
            'previewSets': [{'manifest': str(p.relative_to(ROOT)), 'states': len(json.loads(p.read_text())['screens'])} for p in sorted(PREVIEW.rglob('manifest.json'))],
            'previewNote': 'Actual WXML/WXSS browser layouts and actual poster renderer through a browser Canvas adapter, with isolated demonstration fixtures; not WeChat device or backend validation.',
            'archives': []}
for name in [source_name, preview_name]:
    p = OUT / name
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None
        if name == source_name:
            names = set(z.namelist())
            assert 'yuanxiang-red-wxapp/app.json' in names
            assert 'yuanxiang-red-wxapp/project.config.json' in names
            assert not any('/.git/' in n or '/.env' in n for n in names)
    manifest['archives'].append({'file': name, 'bytes': p.stat().st_size,
                                'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT / 'delivery-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'output': str(OUT), 'sourceFiles': len(source_files), 'archives': manifest['archives']}, ensure_ascii=False, indent=2))

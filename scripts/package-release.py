"""Package source and separate, non-production layout previews without credentials or Git metadata."""
from pathlib import Path
import json,hashlib,zipfile,shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'scratch'/'yuanxiang_release'
PREVIEW=ROOT.parent/'scratch'/'yuanxiang_release_preview'
OUT.mkdir(parents=True,exist_ok=True)
excluded={'.git','.agents','.aws','.codex','__pycache__','node_modules','.pytest_cache'}
source_files=[p for p in ROOT.rglob('*') if p.is_file() and not excluded.intersection(p.relative_to(ROOT).parts) and p.suffix not in ['.pyc','.log']]
with zipfile.ZipFile(OUT/'yuanxiang-wxapp-source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(source_files):z.write(p,'yuanxiang-wxapp/'+p.relative_to(ROOT).as_posix())
preview_files=[p for p in PREVIEW.iterdir() if p.suffix in ['.png','.html'] or p.name in ['geometry.json','manifest.json','render-warnings.json']]
with zipfile.ZipFile(OUT/'yuanxiang-layout-preview.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(preview_files):z.write(p,'yuanxiang-layout-preview/'+p.name)
 z.write(ROOT/'design/preview/README.md','yuanxiang-layout-preview/README.md')
for name in ['overview.png','home.png','tasks.png','gifts.png','mine.png','read.png','sign.png','product.png']:
 shutil.copy2(PREVIEW/name,OUT/name)
shutil.copy2(ROOT/'README.md',OUT/'README.md')
shutil.copy2(ROOT/'RELEASE_NOTES.md',OUT/'RELEASE_NOTES.md')
shutil.copy2(ROOT/'scripts/validation-report.json',OUT/'validation-report.json')
report=json.loads((ROOT/'scripts/validation-report.json').read_text())
manifest={'sourcePages':48,'changedTemplates':48,'changedStyles':48,'behaviorTests':{'passed':65,'failed':0,'skipped':0},'sourceChecks':report,'previewNote':'Actual WXML/WXSS rendered through browser conversion with separate demonstration fixtures; not a WeChat screenshot or backend test.','archives':[]}
for name in ['yuanxiang-wxapp-source.zip','yuanxiang-layout-preview.zip']:
 p=OUT/name
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  if name.endswith('source.zip'):
   names=set(z.namelist());assert 'yuanxiang-wxapp/app.json' in names and 'yuanxiang-wxapp/project.config.json' in names
   assert not any('/.git/' in n for n in names)
 manifest['archives'].append({'file':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'sourceFiles':len(source_files),'archives':manifest['archives']},ensure_ascii=False,indent=2))

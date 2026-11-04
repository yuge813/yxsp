"""Create a small importable mini-program source archive using the project's pack exclusions."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/releases/yuanxiang-referral-wxapp.zip'
config=json.loads((ROOT/'project.config.json').read_text())
rules=config['packOptions']['ignore']
def ignored(name):
 for rule in rules:
  value=str(rule.get('value','')).strip('/')
  kind=rule['type']
  if (kind=='folder' and (name==value or name.startswith(value+'/'))) or (kind=='file' and name==value) or (kind=='suffix' and name.endswith(value)) or (kind=='prefix' and name.startswith(value)):return True
 return False
excluded={'.git','.agents','.aws','.codex','__pycache__','node_modules','.pytest_cache'}
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and not excluded.intersection(p.relative_to(ROOT).parts) and not ignored(p.relative_to(ROOT).as_posix()) and p.suffix not in ('.pyc','.log') and not p.name.startswith('.env'))
paths={p.relative_to(ROOT).as_posix() for p in files}
assert {'app.js','app.json','app.wxss','project.config.json','siteinfo.js'}<=paths
assert not any(n.startswith(('backend_patch/','tests/','scripts/','docs/','design/')) for n in paths)
for route in json.loads((ROOT/'app.json').read_text())['pages']:
 for ext in ('.js','.json','.wxml'):assert route+ext in paths,route+ext
raw=sum(p.stat().st_size for p in files)
assert raw<=2*1024*1024, 'Source estimate exceeds 2 MiB; official compiled size still requires DevTools.'
OUT.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(OUT,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files:
  item=zipfile.ZipInfo('yuanxiang-wxapp/'+p.relative_to(ROOT).as_posix());item.create_system=3;item.external_attr=0o100644<<16;item.compress_type=zipfile.ZIP_DEFLATED;z.writestr(item,p.read_bytes())
with zipfile.ZipFile(OUT) as z:
 assert z.testzip() is None
 for p in files:assert z.read('yuanxiang-wxapp/'+p.relative_to(ROOT).as_posix())==p.read_bytes()
manifest={'archive':OUT.name,'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'files':len(files),'raw_source_bytes':raw,'registered_pages':len(json.loads((ROOT/'app.json').read_text())['pages']),'scope':'Importable runtime source only. Not a WeChat compiled upload package. Backend is delivered separately.'}
(OUT.parent/'frontend-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False))

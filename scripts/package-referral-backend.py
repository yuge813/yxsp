"""Package only reviewed backend overlay files; never include private configuration or certificates."""
from pathlib import Path
import argparse, hashlib, json, re, zipfile
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--backend-root',type=Path,required=True)
p.add_argument('--original-root',type=Path,required=True)
p.add_argument('--output',type=Path,default=ROOT/'docs/releases/yuanxiang-referral-backend.zip')
a=p.parse_args();backend=a.backend_root.resolve();original=a.original_root.resolve();output=a.output.resolve()
files=['wxapp.php','site.php','class/util.class.php','class/v11_social.trait.php','class/v150_referral_rewards.trait.php','class/referral150/schema.php','inc/web/referral150.inc.php','inc/web/v11.inc.php','template/v11_plain.php','inc/web/growth13.inc.php','inc/web/growth13_v134_api.inc.php','inc/web/growth13_v134_view.inc.php','inc/web/growth13_v14_view.inc.php','migrations/referral150.sql']
# Also include a modified growth extension if the reviewed change actually needs it.
for name in ['inc/web/growth13_v14_api.inc.php','inc/web/growth13_v141_view.inc.php']:
 if (backend/name).is_file() and (original/name).is_file() and (backend/name).read_bytes()!=(original/name).read_bytes():files.append(name)
missing=[f for f in files if not (backend/f).is_file()]
if missing:raise SystemExit('Missing reviewed overlay files: '+', '.join(missing))
changed={str(f.relative_to(backend)) for f in backend.rglob('*') if f.is_file() and (not (original/f.relative_to(backend)).is_file() or f.read_bytes()!=(original/f.relative_to(backend)).read_bytes())}
if changed-set(files):raise SystemExit('Unreviewed backend changes: '+', '.join(sorted(changed-set(files))))
patterns=[r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}',r'''(?i)(?:["'](?:appsecret|password|private_key|api_key|access_token|auth_token)["']\s*=>|\$(?:appsecret|password|private_key|api_key|access_token|auth_token)\s*=)\s*["'][^"']{12,}["']''']
for f in files:
 if any(re.search(pattern,(backend/f).read_text(errors='replace')) for pattern in patterns):raise SystemExit('Potential embedded credential: '+f)
manifest={'release':'yuanxiang-real-referral-20261104','rule':{'invitee_first_sign':5,'inviter_distinct_sign_days':2,'inviter_coins':10,'currency':'noncash_coins'},'scope':'New enabled campaign and eligible new bindings only; no production deployment performed.','files':[]}
output.parent.mkdir(parents=True,exist_ok=True)
local=ROOT/'backend_patch/addons/sage_dksy'
for f in files:
 content=(backend/f).read_bytes();dest=local/f;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(content)
 manifest['files'].append({'path':'addons/sage_dksy/'+f,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest(),'original_sha256':hashlib.sha256((original/f).read_bytes()).hexdigest() if (original/f).is_file() else None})
manifest_path=ROOT/'backend_patch/MANIFEST.json';manifest_path.parent.mkdir(parents=True,exist_ok=True);manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
instructions=ROOT/'backend_patch/INSTALL_CN.md'
if not instructions.exists():raise SystemExit('Write reviewed backend_patch/INSTALL_CN.md before packaging')
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 def write(name,body):
  item=zipfile.ZipInfo(name);item.create_system=3;item.external_attr=(0o100644<<16);item.compress_type=zipfile.ZIP_DEFLATED;z.writestr(item,body)
 for f in files:write('addons/sage_dksy/'+f,(backend/f).read_bytes())
 write('INSTALL_CN.md',instructions.read_bytes());write('MANIFEST.json',manifest_path.read_bytes())
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 assert not any('private' in n.lower() or '/cert/' in n.lower() or n.endswith('.pem') for n in z.namelist())
 for item in manifest['files']:assert hashlib.sha256(z.read(item['path'])).hexdigest()==item['sha256']
print(json.dumps({'output':str(output),'files':len(files),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()},ensure_ascii=False))

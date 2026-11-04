"""Build the minimal reminder overlay with exact project-root paths and file hashes."""
from pathlib import Path
import hashlib, json, zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/patches'
OUT.mkdir(parents=True,exist_ok=True)
BUILD='YX-REMINDER-20261104-R1'
files=[Path('sage_dksy/pages/v14/reminders/index'+ext) for ext in ['.js','.wxml','.wxss','.json']]
assert BUILD in (ROOT/files[0]).read_text()
assert '提醒登记未成功，请重试' not in (ROOT/files[0]).read_text()
instructions='''元享签到提醒覆盖补丁
版本：YX-REMINDER-20261104-R1

1. 解压本补丁。将里面的 sage_dksy 文件夹复制到【当前微信开发者工具所导入的项目根目录】，选择替换同名文件。
   正确位置：项目根目录/sage_dksy/pages/v14/reminders/index.js
   项目根目录应同时能看到 app.json 和 project.config.json。
   不要把整个补丁压缩包或解压后的外层文件夹放进项目里就直接编译。
2. 在微信开发者工具中选择“清缓存 → 全部清除”，再点击“编译”，重新进入签到提醒页。
   清除全部缓存可能要求重新登录；测试账号照常完成登录即可。
3. Console 应出现：[元享签到提醒版本] YX-REMINDER-20261104-R1
   若没有这行，说明工具仍未加载补丁中的页面，请核对当前项目路径。

实际 adddy 响应为 {"error":1,"msg":"今天已经订阅"} 时：
页面显示“今日已订阅”，说明文字确认已登记，按钮禁用。
原始 Network 响应由后台返回；补丁不修改后台返回码，也不保证订阅消息一定送达。
其他错误不会伪装成功。拒绝授权不会发登记请求；网络不确定不会自动重发。
补丁仅覆盖该提醒页四个文件，不含后端、AppID或域名配置变更。
'''
manifest={'build':BUILD,'baseSourceCommit':'dc13ff4df211e2a994dd3d6f553fcc8ce7bee2cc','files':[{'path':str(p),'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest(),'bytes':(ROOT/p).stat().st_size} for p in files]}
archive=OUT/'yuanxiang-sign-reminder-patch.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files:z.write(ROOT/p,str(p))
 z.writestr('安装说明.txt',instructions.encode('utf-8-sig'))
 z.writestr('patch-manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert set(z.namelist())==set([str(p) for p in files]+['安装说明.txt','patch-manifest.json'])
 for p in files:assert z.read(str(p))==(ROOT/p).read_bytes()
(OUT/'README.md').write_text('# 签到提醒覆盖补丁\n\n[下载补丁](yuanxiang-sign-reminder-patch.zip)，解压后将 `sage_dksy` 文件夹覆盖到当前项目根目录，再清除开发者工具缓存并编译。\n\nConsole 应显示 `YX-REMINDER-20261104-R1`，用于核对运行文件。对于后台明确的“今天已经订阅”，页面显示“今日已订阅”；Network原始返回码继续由后台决定。\n\n补丁只含提醒页JS/WXML/WXSS/JSON、安装说明与哈希清单。\n')
print(json.dumps({'file':str(archive),'bytes':archive.stat().st_size,'build':BUILD,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()},ensure_ascii=False))

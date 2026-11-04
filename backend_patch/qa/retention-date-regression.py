"""Execute all three source SQL definitions against isolated SQLite fixtures.
This checks calendar-day semantics; integration still needs the real MySQL engine.
"""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import math,re,sqlite3,unittest,os
ROOT=Path(os.environ.get('YX_QA_BACKEND_ROOT',str(Path(__file__).resolve().parents[1]/'addons/sage_dksy')))
TZ=timezone(timedelta(hours=8))
def ts(value): return int(datetime.fromisoformat(value).replace(tzinfo=TZ).timestamp())
def source_queries():
 result=[]
 for name in ['inc/web/growth13.inc.php','inc/web/growth13_v134_api.inc.php']:
  for number,line in enumerate((ROOT/name).read_text().splitlines(),1):
   if 'GROUP BY u.id HAVING COUNT(DISTINCT FLOOR' not in line or 'u.createtime+28800' not in line:continue
   body=line[line.index('"SELECT')+1:line.rfind('"')]
   body=re.sub(r'"\s*\.\s*\$yxT\(\'(user|qian)\'\)\s*\.\s*"',lambda m:m.group(1),body)
   result.append((f'{name}:{number}',body))
 assert len(result)==3,len(result)
 return result
QUERIES=source_queries()
class NaturalDayTests(unittest.TestCase):
 def evaluate(self,registration='2026-11-04T10:30:00',days=('2026-11-04T00:00:00','2026-11-05T00:00:00'),inviter='A',qtenant=1):
  results=[]
  for name,query in QUERIES:
   db=sqlite3.connect(':memory:');db.create_function('FLOOR',1,math.floor)
   db.executescript('CREATE TABLE user(id INTEGER,uniacid INTEGER,openid TEXT,createtime INTEGER,fromid TEXT); CREATE TABLE qian(uniacid INTEGER,openid TEXT,datetime INTEGER);')
   db.execute('INSERT INTO user VALUES(1,1,?,?,?)',('B',ts(registration),inviter))
   db.executemany('INSERT INTO qian VALUES(?,?,?)',[(qtenant,'B',ts(day)) for day in days])
   params={'u':1,'s':ts('2026-11-04T00:00:00'),'e':ts('2026-11-11T00:00:00'),'qend':ts('2026-11-11T00:00:00'),'e2':ts('2026-11-11T00:00:00')}
   results.append(db.execute(query,params).fetchone()[0]);db.close()
  return results
 def test_registration_day_and_next_day_count(self): self.assertEqual(self.evaluate(),[1,1,1])
 def test_duplicate_same_day_does_not_count_twice(self): self.assertEqual(self.evaluate(days=('2026-11-04T00:00:00','2026-11-04T00:00:00')),[0,0,0])
 def test_pre_registration_day_is_excluded(self): self.assertEqual(self.evaluate(days=('2026-11-03T00:00:00','2026-11-05T00:00:00')),[0,0,0])
 def test_nonconsecutive_days_are_eligible(self): self.assertEqual(self.evaluate(days=('2026-11-04T00:00:00','2026-11-06T00:00:00')),[1,1,1])
 def test_missing_inviter_excluded(self): self.assertEqual(self.evaluate(inviter=''),[0,0,0])
 def test_cross_tenant_signs_excluded(self): self.assertEqual(self.evaluate(qtenant=2),[0,0,0])
 def test_registration_before_window_excluded(self): self.assertEqual(self.evaluate(registration='2026-11-03T23:59:59'),[0,0,0])
 def test_signs_at_end_boundary_excluded(self): self.assertEqual(self.evaluate(days=('2026-11-04T00:00:00','2026-11-11T00:00:00')),[0,0,0])
 def test_midnight_registration_keeps_semantics(self): self.assertEqual(self.evaluate(registration='2026-11-04T00:00:00'),[1,1,1])
 def test_beijing_early_morning_utc_previous_date(self): self.assertEqual(self.evaluate(registration='2026-11-04T00:30:00'),[1,1,1])
if __name__=='__main__':
 print('Source queries:',*[name for name,_ in QUERIES],sep='\n')
 unittest.main(verbosity=2)

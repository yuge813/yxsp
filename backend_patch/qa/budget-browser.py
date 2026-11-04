"""Check the actual admin form script and native number-input constraints offline."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
s=(root/'addons/sage_dksy/inc/web/referral150.inc.php').read_text()
js=s.rsplit('<script>',1)[1].split('</script>',1)[0]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page()
 page.set_content('<p id="referralBudgetHelp"></p><form id="referralConfig"><input name="inviter_points" type="number" value="10" min="1" max="500" required><input name="invitee_points" type="number" value="5" min="0" max="500" required><input name="daily_budget_coins" type="number" required><input name="total_budget_coins" type="number" required></form>')
 page.add_script_tag(content=js)
 assert page.locator('[name=daily_budget_coins]').get_attribute('min')=='15'
 assert '10 + 5 = 15' in page.locator('#referralBudgetHelp').inner_text()
 assert not page.locator('#referralConfig').evaluate('(f)=>f.checkValidity()')
 page.locator('[name=daily_budget_coins]').fill('0');page.locator('[name=total_budget_coins]').fill('1500')
 assert not page.locator('#referralConfig').evaluate('(f)=>f.checkValidity()')
 page.locator('[name=daily_budget_coins]').fill('150')
 assert page.locator('#referralConfig').evaluate('(f)=>f.checkValidity()')
 page.locator('[name=inviter_points]').fill('20')
 assert page.locator('[name=daily_budget_coins]').get_attribute('min')=='25'
 assert '20 + 5 = 25' in page.locator('#referralBudgetHelp').inner_text()
 page.locator('[name=daily_budget_coins]').fill('24')
 assert not page.locator('#referralConfig').evaluate('(f)=>f.checkValidity()')
 browser.close()
report={'status':'passed','checks':['initial minimum equals A+B','formula uses actual reward values','blank budgets blocked','zero budget blocked','150/1500 accepted','reward changes update minimum and explanation','underfunded budget blocked'],'scope':'Offline Chromium native form validation with the actual admin inline script; no production connection'}
(Path(__file__).parent/'budget-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))

from ui import *

def mini_task(icon,title,sub,amount,action='去完成',cls=''):
 return f'<div class="task-card {cls}"><div class="task-top"><span class="task-icon">{ic(icon,25)}</span><div><h3>{title}</h3><p>{sub}</p></div>{tag("可参与" if action not in ["已完成","02:36"] else action)}</div><div class="task-bottom"><div><b>{amount}</b><span>金币</span></div>{btn(action)}</div></div>'
def sign_days(compact=False,signed=False):
 vals=[5,10,25,25,35,50,88]
 return '<div class="sign-days '+('compact-days' if compact else 'big-days')+'">'+''.join(f'<div class="sign-day {"done" if i<3 or signed and i==3 else "today" if i==3 else "future"} {"seventh" if i==7 else ""}"><span>{"今天" if i==3 else "第"+str(i)+"天"}</span><div>{ic("yes",19) if i<3 or signed and i==3 else ic("gift",25) if i==7 else ic("coin",23)}</div><b>{"已签到" if i<3 or signed and i==3 else "+"+str(n)}</b>{"<small>第7天 · 加码奖励</small>" if i==7 and not compact else ""}</div>' for i,n in enumerate(vals,1))+'</div>'
def ledger_rows(mode='all'):
 rows=[('check','每日签到','今天 09:41','+25','income'),('play','广告奖励','今天 09:38','+2','income'),('gift','兑换随行保温杯','昨天 17:26','−1,800','expense'),('play','广告奖励','昨天 10:16','+2','income'),('check','每日签到','昨天 09:30','+10','income')]
 return ''.join(f'<div class="ledger-row"><span class="ledger-icon {kind}">{ic(icon,21)}</span><div><b>{title}</b><small>{time}</small></div><strong class="{kind}">{money}</strong></div>' for icon,title,time,money,kind in rows if mode=='all' or mode==kind)

def build():
 out=[]
 # 01 — A compact red rewards cockpit, no old editorial hero or eight-icon directory.
 hero=f'<div class="home-stage"><div class="home-aurora"></div><div class="home-stage-copy"><span class="stage-label">每天来元享 · 好礼有盼头</span><h1>赚点金币，<br>把喜欢带回家。</h1><span class="stage-note">签到 · 看广告 · 换好礼</span></div><div class="home-keyart">{gift_art()}</div></div>'
 wallet=f'<div class="home-wallet"><div><span>{ic("coin",16)} 我的金币</span><b>2,680<small>金币</small></b></div><span>明细 {ic("arrow",13)}</span></div>'
 sign=f'<div class="home-check card"><div class="check-heading"><div><b>每日签到</b><span>今天可领 <strong>25</strong> 金币</span></div>{tag("已连续 2 天","gold-tag")}</div>{sign_days(True)}{btn("立即签到　+25 金币")}</div>'
 tiles=f'<div class="home-function-tiles"><div class="function-tile ad-tile"><div>{ic("play",26)}<b>看广告赚金币</b><span>自愿观看 · 每次 +2</span></div><span class="tile-circle">{ic("arrow",15)}</span></div><div class="function-tile invite-tile"><div>{ic("friend",26)}<b>邀请好友</b><span>分享元享 · 一起攒好礼</span></div><span class="tile-circle">{ic("arrow",15)}</span></div></div>'
 trialstrip=f'<div class="home-trial-strip"><span class="trial-mini-art">{product("kettle")}</span><div><b>新品试用 · 免费申请</b><span>喜欢的新好物，先来体验</span></div>{ic("arrow",18)}</div>'
 goods=f'<div class="home-goods-head"><h3>金币换好礼</h3><span>更多好礼 ›</span></div><div class="goods-grid">{card_product("bottle","随行真空保温杯","1,800")}{card_product("headphones","轻盈头戴式耳机","2,400")}</div>'
 out.append(screen(1,'元享',hero+f'<div class="home-deck">{wallet}{sign}{tiles}{trialstrip}{goods}</div>',tab='首页',back=False,classes='flush red-nav home-root'))
 # 02 — Bold earned-coins ticket plus action-led native ad tasks.
 body=redhero('今天的收获，<br>从这里开始。','每天一点金币，离喜欢更近一点。','coin')
 body+='<div class="earned-ticket"><div><span>今日已到账</span><b>27 <small>金币</small></b></div><span>查看明细 ›</span></div>'
 body+=mini_task('play','自愿看广告','完整观看后领取 · 剩余 3 次','+2','去观看')
 body+=f'<div class="earn-check"><div><span class="earn-check-icon">{ic("check",26)}</span><div><b>今天还没签到</b><span>连续签到，奖励提前看</span></div></div>{btn("签到 +25","secondary")}</div>'
 body+=f'<div class="invite-inline"><span>{ic("friend",25)}</span><div><b>邀请好友一起用元享</b><small>查看我的好友与专属海报</small></div>{ic("arrow",16)}</div>'
 body+=notice('普通浏览无需观看广告；金币到账以实际记录为准。')
 out.append(screen(2,'赚金币',body,tab='赚金币',back=False,classes='red-nav'))
 # 03 — Retail composition prioritizes product photography and clear coin prices.
 shophero=f'<div class="shop-title"><div><span>用积累，兑换日常喜欢</span><h1>金币好礼</h1></div><div class="shop-wallet-pill">{ic("coin",17)}2,680</div></div><div class="shop-cover"><div class="shop-cover-image">{product("cup")}</div><div class="shop-cover-copy">{tag("日常好物","gold-tag")}<h2>让每一杯，<br>都多一点喜欢。</h2><span>陶瓷马克杯　1,800 金币</span></div></div>'
 body=shophero+'<div class="pill-tabs"><span class="active">全部</span><span>居家生活</span><span>数码配件</span><span>饮水出行</span></div>'
 body+=section('为你精选','兑换记录')+f'<div class="goods-grid">{card_product("bottle","随行真空保温杯","1,800","可兑换")}{card_product("headphones","轻盈头戴式耳机","2,400","可兑换")}{card_product("cream","日常护理礼盒","3,600")}{card_product("bag","轻便帆布手提袋","2,200")}</div>'
 out.append(screen(3,'金币商城',body,tab='好礼',back=False,classes='red-nav'))
 # 04 — One hero trial, explicit application gate, clear quantity/end date.
 body=f'<div class="trial-index-heading"><span>先试一试，再发现喜欢</span><h1>新品免费试用</h1><span class="trial-header-mark">{gift_art()}</span></div><div class="pill-tabs"><span class="active">正在报名</span><span>即将开始</span><span>已结束</span></div>'
 body+=f'<div class="trial-feature"><div class="trial-feature-image">{product("kettle")}{tag("新品体验")}</div><div class="trial-feature-copy"><h2>简约恒温电热水壶</h2><p>把每一次喝水，变成小小享受。</p><div class="trial-feature-stats"><div><span>试用名额</span><b>20 <small>份</small></b></div><div><span>报名截止</span><b>11.10 <small>18:00</small></b></div></div>{btn("免费申请")}</div></div>'
 body+=notice('申请不等于中选，请以实际公布的名单为准。')
 body+=f'<div class="trial-my-entry">{ic("order",24)}<div><b>我的试用</b><span>查看报名、中选与领取进度</span></div>{ic("arrow",17)}</div>'
 out.append(screen(4,'商品试用',body,tab='试用',back=False,classes='red-nav'))
 # 05 — Different habit visual: a six-day matrix and a golden seventh-day milestone.
 body=f'<div class="sign-topline"><div><span>已连续签到</span><b>2 <small>天</small></b></div><span>{ic("bell",18)} 签到提醒</span></div><div class="sign-today-stage"><span>今天签到可领取</span><div><b>25</b><small>金币</small></div><div class="sign-single-coin">{coin_art()}</div></div>'
 body+=f'<div class="sign-calendar card">{section("我的 7 天签到", "签到记录")}{sign_days()}{notice("每天一次签到，记录每一天的小收获。")}</div>'
 out.append(screen(5,'每日签到',body,footer=btn('立即签到，领取 25 金币'),classes='red-nav sign-root'))
 # 06 — A gold award ticket after a verified credit.
 body=f'<div class="sign-success-art">{coin_art()}<span>签到成功</span></div><h1 class="sign-result-head">今天的坚持，<br>已经到账。</h1><div class="prize-ticket"><span>本次获得</span><b>+25<small>金币</small></b><div class="ticket-divider"></div><div><span>当前金币</span><strong>2,705</strong></div><div><span>连续签到</span><strong>3 天</strong></div></div><div class="next-day-strip">{ic("check",24)}<div><b>明天继续，奖励提前看</b><span>第 4 天签到奖励：25 金币</span></div></div>'
 out.append(screen(6,'签到成功',body,footer=btn('查看金币明细'),classes='red-nav'))
 # 07 — Actual check-in entries, no fictional aggregate promise.
 body='<div class="top-title"><h1>每一天，都记得。</h1><p class="muted">签到记录与到账情况</p></div><div class="sign-record-summary"><div><span>连续签到</span><b>3 <small>天</small></b></div><div><span>今天签到</span><b class="strong-red">已完成</b></div></div><div class="month-heading"><b>2026 年 11 月</b><span>本月记录</span></div><div class="record-calendar"><div class="week-row">'+''.join(f'<span>{x}</span>' for x in ['一','二','三','四','五','六','日'])+'</div><div class="calendar-dots">'+''.join(f'<span class="{"day-recorded" if i in [1,2,3] else ""}">{i if 1<=i<=30 else ""}</span>' for i in [0]*6+list(range(1,31))+[0]*6)+'</div></div>'
 body+=section('已加载签到记录')+f'<div class="card ledger-card">{''.join(f'<div class="ledger-row"><span class="ledger-icon income">{ic("check",21)}</span><div><b>每日签到</b><small>{day} 09:41</small></div><strong class="income">+{amount}</strong></div>' for day,amount in [('11月03日',25),('11月02日',10),('11月01日',5)])}</div>'
 out.append(screen(7,'签到记录',body))
 # 08 — Transparent opt-in reminder explanation.
 body=f'<div class="reminder-hero"><span>{ic("bell",58)}</span><h1>明天的奖励，<br>也别错过。</h1><p>自主订阅下一次签到提醒</p></div><div class="card reminder-card"><div class="reminder-title">{ic("check",24)}<b>下一次签到提醒</b>{tag("未订阅","gray-tag")}</div><p>允许后，微信可向你发送下一次签到提醒。是否送达，以微信规则为准。</p></div><div class="reminder-steps">'+''.join(f'<div><span>{i}</span><div><b>{t}</b><p>{d}</p></div></div>' for i,t,d in [(1,'点击下方订阅','由你主动发起订阅'),(2,'在微信弹窗中选择允许','无需额外填写个人信息'),(3,'按提醒回来签到','拒绝或关闭不影响正常签到')])+'</div>'
 out.append(screen(8,'签到提醒',body,footer=btn('订阅下一次提醒'),classes='red-nav'))
 # 09 — Clear voluntary full-watch conditions before triggering native SDK.
 body=f'<div class="ad-prelude"><div class="ad-play-emblem">{ic("play",42)}</div><span>自愿参与 · 广告奖励</span><h1>看一段广告，<br>攒一点金币。</h1></div><div class="ad-offer-card"><span>本次可领取</span><div><b>+2</b><small>金币</small></div><div class="ad-offer-meta"><span>今日剩余</span><b>3 次</b></div></div><div class="card watch-rules">{row("play","完整观看后领取","提前关闭，本次不发放奖励")}{row("shield","到账以服务端核验为准","可在金币明细查看结果")}{row("clock","按实际状态参与","冷却、次数及当日规则以页面为准")}</div>'
 out.append(screen(9,'广告奖励',body,footer=btn('自愿观看，完成领 2 金币'),classes='red-nav'))
 # 10 — Native advertisement is an SDK-owned full view, not bespoke product controls.
 body=f'<div class="native-ad-context"><div class="sdk-label">微信原生激励广告视图 · 示意</div><div class="sdk-product">{product("headphones")}</div><div class="sdk-copy"><h1>广告内容区域</h1><p>广告素材与播放控件由微信提供</p><div class="sdk-native-strip"><span>原生广告</span><span>完整观看后按规则领取</span></div></div></div>'
 out.append(screen(10,'原生广告播放',body,classes='flush ad-native-root'))
 # 11 — Strong success; account ledger is the next step.
 body=f'<div class="ad-paid-header">{status_mark("yes")}<span class="tag gold-tag">完整观看 · 结算成功</span><h1>本次奖励已到账</h1></div><div class="prize-ticket ad-paid-ticket"><span>本次获得金币</span><b>+2<small>金币</small></b><div class="ticket-divider"></div><div><span>当前金币</span><strong>2,682</strong></div><div><span>任务类型</span><strong>广告奖励</strong></div></div><div class="notice">{ic("clock",18)}<span>下一次参与时间按当前任务状态显示，奖励可在明细核对。</span></div><div class="ad-paid-next"><span>{ic("gift",26)}</span><div><b>离喜欢的好礼，又近一点。</b><p>去看看金币可以兑换什么</p></div>{ic("arrow",17)}</div>'
 out.append(screen(11,'奖励到账',body,footer=btn('查看金币明细')))
 # 12 — Honest interrupted state, no reward display.
 body=f'<div class="interrupted-art">{status_mark("play","gray-mark")}<div class="interrupted-slash"></div></div><h1 class="result-title">这次还没有获得奖励</h1><p class="result-sub">广告未完整观看，<br>本次不会发放金币。</p><div class="card interrupted-card">{info_line("本次奖励","未发放")}{info_line("我的金币","2,680 金币")}</div><div class="notice">{ic("info",17)}<span>你可以返回任务页重新查看可参与状态，也可以继续浏览好礼。</span></div><div class="result-section">{btn("返回赚金币")}{btn("去看看好礼","outline")}</div>'
 out.append(screen(12,'观看未完成',body))
 # 13 — Dedicated coins asset view; no implied cash withdrawal.
 body=f'<div class="coin-account-stage"><span>当前可用金币</span><div><b>2,680</b><small>金币</small></div><p>签到和自愿广告所得，可用于兑换商品。</p><div class="coin-account-art">{coin_art()}</div></div><div class="coin-two-actions"><div>{ic("play",24)}<b>继续赚金币</b><span>查看可参与任务</span></div><div>{ic("gift",24)}<b>金币换商品</b><span>去挑喜欢的好礼</span></div></div>'
 body+=section('近期金币记录','全部明细')+f'<div class="card ledger-card">{ledger_rows()}</div>'+notice('金币不是现金，不提供提现；兑换规则请查看商品说明。')
 out.append(screen(13,'我的金币',body,classes='red-nav'))
 for id,name,mode in [(14,'金币明细','all'),(15,'金币收入','income'),(16,'金币支出','expense')]:
  tabs=f'<div class="ledger-tabs"><span class="{"active" if mode=="all" else ""}">全部</span><span class="{"active" if mode=="income" else ""}">收入</span><span class="{"active" if mode=="expense" else ""}">支出</span></div>'
  body=balance()+tabs
  if mode=='all':body+='<div class="ledger-month"><h3>2026 年 11 月</h3><span>按发生时间排列</span></div>'
  elif mode=='income':body+='<div class="ledger-income-summary"><span>已加载收入</span><b>+39 <small>金币</small></b><p>仅统计当前已加载记录</p></div>'
  else:body+='<div class="ledger-expense-summary"><span>已加载支出</span><b>−1,800 <small>金币</small></b><p>兑换商品扣除，以实际记录为准</p></div>'
  body+=f'<div class="card ledger-card">{ledger_rows(mode)}</div>'
  if mode=='expense':body+=f'<div class="ledger-order-card"><div>{product("bottle")}</div><section><b>随行真空保温杯</b><p>兑换支出 · 1,800 金币</p><span>查看对应兑换记录 ›</span></section></div>'
  body+='<div class="small-link">已显示当前加载记录</div>'
  out.append(screen(id,name,body))
 return out

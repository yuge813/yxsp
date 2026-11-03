"""12 fresh red design drawings: trial journey and non-happy-path states."""
from ui import screen,ic,product,gift_art,coin_art,btn,tag,section,row,balance,notice,info_line,status_mark,card_product


def steps(active=1,labels=('提交申请','等待结果','中选收货')):
    return '<div class="tr-steps">'+''.join(f'<div class="{"is-current" if i==active else "is-done" if i<active else ""}"><b>{ic("yes",13) if i<active else str(i)}</b><span>{t}</span></div>' for i,t in enumerate(labels,1))+'</div>'


def item(kind='kettle',name='简约恒温电热水壶',sub='元享体验计划 · 20份试用名额',status=''):
    return f'<div class="tr-product-row"><div class="tr-small-product">{product(kind)}</div><div><b>{name}</b><span>{sub}</span>{tag(status) if status else ""}</div></div>'


def trial_record(kind,name,status,detail,action,style=''):
    return f'<div class="tr-record card"><div class="tr-record-top"><span>11月03日申请</span>{tag(status,style)}</div>{item(kind,name,detail)}<div class="tr-record-bottom"><span>申请不等于中选</span><b>{action} {ic("arrow",12)}</b></div></div>'


def result_header(kicker,title,sub,icon='yes',class_name=''):
    return f'<div class="tr-result-head {class_name}"><div class="tr-result-rays"></div><div class="tr-result-symbol">{ic(icon,38)}</div><span>{kicker}</span><h1>{title}</h1><p>{sub}</p></div>'


def build():
    pages=[]
    #25 A clear retail product stage, not a reused dashboard card.
    body=f'''<div class="tr-detail-stage"><div class="tr-detail-light"></div><div class="tr-stage-label">{ic('bag',14)} 元享体验计划</div><div class="tr-stage-product">{product('kettle')}</div><div class="tr-stage-caption">把喜欢的好物，带进日常</div><span class="tr-gallery-dots"><b></b><i></i><i></i></span></div>
    <div class="tr-detail-body"><div class="tr-campaign-line">{tag('正在报名')}<span>截止 11月10日 18:00</span></div><h1>简约恒温电热水壶</h1><p class="tr-detail-desc">温暖每个日常，邀请你来体验。</p><div class="tr-detail-stats"><div><strong>20<small>份</small></strong><span>试用名额</span></div><div><strong>0<small>金币</small></strong><span>申请无需扣币</span></div><div><strong>免费</strong><span>中选后按规则体验</span></div></div>{steps(1)}<div class="tr-important">{ic('shield',18)}<div><b>先申请，再等待活动结果</b><span>申请成功不代表中选，请以最终结果为准。</span></div></div>{section('参与须知')}<div class="tr-rules"><p><b>01</b> 报名截止前，可自愿提交一次申请。</p><p><b>02</b> 中选后按要求完善收货资料。</p><p><b>03</b> 活动名额与具体规则以页面为准。</p></div>{section('商品介绍')}<div class="tr-description-art">{product('kettle')}<span>轻松喝上<br><b>刚刚好的温水。</b></span></div></div>'''
    pages.append(screen(25,'试用详情',body,footer=btn('免费申请试用'),classes='flush red-nav tr-page'))
    #26 A three-step confirmation form with an explicit no-charge summary.
    body=f'''<div class="tr-apply-intro"><span>好物体验，从一次申请开始</span><h1>确认本次申请</h1><p>申请提交后，可随时查看活动结果。</p></div>{steps(1)}<div class="card tr-application-card">{item()}<div class="tr-free-line"><span>本次申请</span><b>免费<small>无需扣除金币</small></b></div></div><div class="tr-eligibility card"><h3>申请前，请确认</h3><div>{ic('yes',17)}<span>本活动正在报名期间</span></div><div>{ic('yes',17)}<span>我已阅读商品试用的活动规则</span></div><div>{ic('yes',17)}<span>我理解申请成功不等于中选</span></div></div><div class="tr-apply-consent"><span>{ic('yes',12)}</span><p>我已知晓活动规则，自愿参与本次试用申请。<b>查看规则 ›</b></p></div><p class="tr-apply-note">现在无需填写收货地址，<br>中选后再提交必要的收货资料。</p>'''
    pages.append(screen(26,'确认试用申请',body,footer=btn('确认申请'),classes='tr-page'))
    #27 The successful application differs from the selected-result composition.
    body=result_header('这份期待，已经为你记下','申请提交成功','接下来，等待活动结果。<br>申请成功不代表中选。','bag')+f'''<div class="tr-result-content"><div class="card tr-result-ticket"><div class="tr-ticket-cap"><span>本次申请</span>{tag('已提交')}</div>{item()}<div class="tr-ticket-line"></div>{info_line('申请时间','11月03日 09:41')}{info_line('当前状态','等待活动结果')}</div>{steps(2)}{notice('中选结果将展示在「我的试用」，请留意查看。')}<div class="small-link">返回试用首页</div></div>'''
    pages.append(screen(27,'申请成功',body,footer=btn('查看我的试用'),classes='flush red-nav tr-page'))
    #28 Personal trial records use compact product tickets and state progress.
    body=f'''<div class="tr-history-head"><span>每一次期待，都清楚可查</span><h1>我的试用</h1><div><b>申请记录</b><span>查看参与进度与活动结果</span></div></div><div class="pill-tabs tr-history-tabs"><span class="active">全部申请</span><span>已中选</span></div>{trial_record('kettle','简约恒温电热水壶','等待结果','报名截止 11月10日','查看进度')}{trial_record('headphones','轻盈头戴式耳机','已中选','请完善中选收货资料','填写资料','gold-tag')}{trial_record('cream','日常轻润护理套装','未中选','本次试用活动已结束','查看结果','gray-tag')}<p class="tr-record-end">活动结果以实际公布信息为准</p>'''
    pages.append(screen(28,'我的试用',body,classes='tr-page'))
    #29 Pending with a radial progress motif, no made-up completion countdown.
    body=f'''<div class="tr-pending-orbit"><span class="tr-orbit-dot one"></span><span class="tr-orbit-dot two"></span><div class="tr-pending-circle">{ic('clock',38)}</div><span class="tr-pending-label">申请已提交</span></div><div class="tr-pending-title"><h1>正在等待结果</h1><p>给这份期待，一点时间。<br>具体结果安排请以活动规则为准。</p></div><div class="card tr-pending-product">{item()}{steps(2)}</div><div class="card tr-checklist"><h3>接下来，你可以</h3>{row('bag','查看活动规则','了解本次试用的结果安排')}{row('order','在我的试用查看进度','中选后再完善必要收货资料')}</div><div class="small-link">返回我的试用</div>'''
    pages.append(screen(29,'试用申请进度',body,footer=btn('查看活动规则'),classes='tr-page'))
    #30 An emphatic selected badge and gift stage, truthful fulfillment next step.
    body=f'''<div class="tr-selected-hero"><div class="tr-selected-ribbon">元享好物体验官</div><h1>这份好物，<br>邀请你来体验！</h1><span>你已中选本次试用</span><div class="tr-selected-gift">{gift_art()}</div><i class="tr-spark a">✦</i><i class="tr-spark b">✦</i></div><div class="tr-selected-content"><div class="card tr-selected-card">{item('kettle','简约恒温电热水壶','中选后请完善收货资料') }<div class="tr-selected-seal">已中选</div></div><div class="card tr-selected-next"><div><span>下一步</span><b>填写收货资料</b><p>姓名、电话和地址仅用于本次试用收货。</p></div><div class="tr-next-number">01</div></div>{notice('请按活动要求及时提交资料。具体配送规则以本次活动说明为准。')}<p class="tr-privacy">{ic('shield',15)} 仅在中选后收集必要的收件信息</p></div>'''
    pages.append(screen(30,'试用中选结果',body,footer=btn('填写收货资料'),classes='flush red-nav tr-page'))
    #31 Unselected is a completed outcome, not a failed request.
    body=f'''<div class="tr-unselected-art"><div class="tr-envelope"><span></span><b>{ic('heart',32)}</b></div><i>✦</i><small>本次活动已结束</small></div><h1 class="tr-centered-title">这次，与你擦肩而过</h1><p class="result-sub">很遗憾，本次试用未中选。<br>感谢你的参与，下一份喜欢继续发现。</p><div class="card tr-outcome-card">{item('kettle','简约恒温电热水壶','本次试用结果已公布','未中选')}</div>{btn('看看其他试用')}<div class="small-link">返回我的试用</div>{section('还有这些好物，值得期待')}<div class="tr-suggestion"><div>{product('headphones')}</div><div><b>轻盈头戴式耳机</b><span>查看正在报名的试用活动</span><strong>发现更多 {ic('arrow',13)}</strong></div></div>'''
    pages.append(screen(31,'试用结果',body,classes='tr-page'))
    #32 Fulfillment data submission receipt with a small, honest two-step overview.
    body=result_header('向喜欢的好物，再近一步','收货资料已提交','可以在「我的试用」查看后续进度。','yes')+f'''<div class="tr-result-content"><div class="card tr-receipt"><div class="tr-receipt-heading">本次试用商品 {tag('资料已提交')}</div>{item('kettle','简约恒温电热水壶','收货资料已记录')}<div class="tr-receipt-address">{ic('location',22)}<div><b>林女士　138****8000</b><span>上海市徐汇区 · 示例收货地址</span></div></div></div><div class="tr-submitted-path"><div><b>{ic('yes',13)}</b><span>资料已提交</span></div><i></i><div><b>{ic('package',15)}</b><span>等待后续配送</span></div></div><p class="tr-fulfillment-note">配送安排及处理进度，以活动实际规则和<br>「我的试用」显示的信息为准。</p><div class="small-link">需要帮助？联系客服 ›</div></div>'''
    pages.append(screen(32,'资料提交成功',body,footer=btn('返回我的试用'),classes='flush red-nav tr-page'))
    #45 A recoverable empty network viewport, distinguished from empty orders.
    body=f'''<div class="tr-error-visual"><div class="tr-error-orbit"></div><div class="tr-error-card back"><i></i><i></i><i></i></div><div class="tr-error-card front"><div>{ic('refresh',34)}</div><span></span><small></small></div><b class="tr-error-spark">!</b></div><div class="tr-error-copy"><span>好礼内容暂未加载</span><h1>连接开了个小差</h1><p>请检查网络后，再试一次。<br>已到账金币和已有记录不会因此清空。</p></div><div class="tr-error-actions">{btn('重新加载')}{btn('返回首页','secondary')}</div><div class="tr-error-help">{ic('headset',18)} 仍然遇到问题？ <b>联系客服 ›</b></div>'''
    pages.append(screen(45,'加载失败',body,classes='tr-page'))
    #46 A real empty ledger-like receipt, gentle reward illustration instead of error treatment.
    body=f'''<div class="tr-empty-order-title"><span>我的兑换</span><h1>喜欢的好礼，<br>从这里开始记录。</h1></div><div class="tr-empty-receipt"><div class="tr-empty-gift">{gift_art()}</div><div class="tr-empty-lines"><i></i><i></i><i></i></div><div class="tr-empty-paper-bottom"></div></div><div class="tr-empty-order-copy"><h2>还没有兑换记录</h2><p>先攒一点金币，再挑一件喜欢的好物。<br>兑换成功后，记录会出现在这里。</p></div>{btn('去挑选好礼')}<div class="tr-empty-wallet">{ic('coin',19)}<span>当前可用金币</span><b>2,680</b><span>金币</span></div>'''
    pages.append(screen(46,'兑换记录',body,classes='tr-page'))
    #47 A disabled state with a very legible countdown and available alternatives.
    body=f'''<div class="tr-cooldown-intro"><span>自愿广告奖励</span><h1>歇一会，<br>下一份奖励稍后再来。</h1></div><div class="tr-countdown"><div class="tr-countdown-ring"><span class="tr-timer-label">本轮冷却剩余</span><b>02<span>:</span>36</b><small>时间结束后，将重新确认任务状态</small></div><i class="tr-timer-dot"></i></div><div class="card tr-cooldown-task"><div><span class="tr-task-icon">{ic('play',25)}</span><div><b>看广告赚金币</b><span>完整观看后按规则领取</span></div><strong>剩余2次</strong></div>{btn('冷却中 · 暂不可观看','disabled')}</div><div class="tr-timer-choices"><b>这段时间，也可以</b>{row('gift','看看心仪的好礼','按自己的节奏慢慢攒')}{row('coin','核对金币明细','查看已到账奖励')}</div>'''
    pages.append(screen(47,'广告奖励冷却中',body,footer=btn('返回赚金币','secondary'),classes='tr-page'))
    #48 Keep product information and give an honest alternative, without inventing restock subscription.
    body=f'''<div class="tr-soldout-stage"><div class="tr-soldout-product">{product('cup')}</div><div class="tr-soldout-badge"><span>本轮好礼</span><b>已兑完</b></div></div><div class="tr-soldout-body"><div class="tr-soldout-price"><b>1,800</b><span>金币</span>{tag('暂时售罄','gray-tag')}</div><h1>日常陶瓷马克杯</h1><p class="muted">这一批好礼已经被领走啦。</p><div class="tr-soldout-note">{ic('gift',24)}<div><b>还有其他好礼，等你发现</b><p>商品与库存以当前上架信息为准。</p></div></div>{btn('暂时缺货 · 不可兑换','disabled')}{section('继续看看这些好礼')}<div class="goods-grid">{card_product('bottle','简约随行保温杯','2,400')}{card_product('bag','轻便帆布手提袋','1,600')}</div></div>'''
    pages.append(screen(48,'商品已售罄',body,footer=btn('发现其他好礼'),classes='flush tr-page'))
    return pages

"""Eight fresh Red Nova social/account design drawings. Design-only, no application imports."""
from ui import screen,ic,coin_art,gift_art,product,qr,tag,btn,section,row,balance,redhero,notice,info_line


def build():
    screens=[]
    hero=f'''<div class="social-invite-stage"><span class="social-stage-label">元享好友计划</span><h1>好礼一起攒<br><em>快乐一起享</em></h1><p>邀请好友，发现每天的小收获</p><div class="social-stage-art">{gift_art()}</div><i class="social-spark s1">✦</i><i class="social-spark s2">✦</i><div class="social-invite-person"><span class="avatar">{ic('user',25)}</span><div><b>小林的专属邀请</b><span>把元享分享给你在意的人</span></div></div></div>'''
    ticket=f'''<div class="social-ticket"><div class="social-ticket-top"><span>{ic('friend',20)} 我的好友</span><b>12<span> 位</span></b><span>查看记录 {ic('arrow',13)}</span></div><div class="social-ticket-body"><div><span class="caption">你的专属邀请入口</span><h3>让朋友，和你一起享</h3><p>扫码了解元享，自主选择参与。</p></div><div class="social-code-small">{qr()}</div></div>{btn('制作专属邀请海报')}</div>'''
    steps=f'''<div class="social-invite-steps"><div>{ic('share',24)}<b>分享邀请</b><span>发送小程序或海报</span></div><i>›</i><div>{ic('user',24)}<b>好友加入</b><span>自愿打开并连接</span></div><i>›</i><div>{ic('gift',24)}<b>一起发现</b><span>签到、赚币、挑好礼</span></div></div>'''
    screens.append(screen(33,'邀请好友',hero+f'<div class="social-invite-body">{ticket}{section("邀请很简单")}{steps}{notice("邀请关系与活动奖励以实际规则为准，分享不代表立即获得金币。")}</div>',classes='social-invite flush red-nav'))

    poster=f'''<div class="social-poster"><div class="social-poster-brand"><span>享</span><b>元享</b><small>每天一点金币，每天一点惊喜</small></div><h1>好礼，<br>就要一起享。</h1><p class="social-poster-sub">签到赚金币 · 好物随心换</p><div class="social-poster-art">{gift_art()}</div><div class="social-poster-lines"></div><div class="social-poster-bottom"><div class="social-poster-person"><span class="avatar">{ic('user',22)}</span><div><b>好友小林邀请你</b><small>长按识别，开启元享</small></div></div><div class="social-poster-code">{qr()}</div></div></div>'''
    p34=f'''<div class="social-poster-intro"><h2>把喜欢，分享给朋友。</h2><p class="muted">专属小程序码，让好友找到你。</p></div>{poster}<div class="social-poster-themes"><b>海报风格</b><span class="selected"></span><span></span><span></span><span></span></div><p class="social-poster-notice">二维码为图稿位置示意，正式海报使用真实专属码。</p>'''
    screens.append(screen(34,'专属邀请海报',p34,footer=btn('保存专属海报')+btn('分享指引','secondary'),classes='social-poster-screen'))

    guidebase=f'''<div class="social-guide-under">{redhero('邀请好友<br>一起发现好礼','分享由你决定，快乐随时开始','gift')}<div class="card">{row('friend','我的好友','查看邀请记录','12 位')}{row('share','专属邀请海报','把心意分享给朋友')}</div></div>'''
    guide=f'''<div class="social-guide-overlay"><svg class="social-guide-arrow" viewBox="0 0 220 160"><path d="M20 140C36 60 175 130 190 18" fill="none" stroke="#FFE394" stroke-width="3" stroke-linecap="round" stroke-dasharray="7 6"/><path d="m175 32 16-18 13 21" fill="none" stroke="#FFE394" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="social-guide-copy"><span>分享方式 01</span><h1>点右上角「···」<br>邀请朋友来元享</h1><p>在微信原生菜单中选择分享，<br>好友由你自主选择。</p></div><div class="social-guide-sheet"><div class="social-guide-sheet-head"><span>{ic('share',24)}</span><div><b>也可以分享专属海报</b><small>保存后，在微信聊天中发送图片</small></div></div><div class="social-guide-step"><b>1</b><span>返回海报页面，保存专属海报</span></div><div class="social-guide-step"><b>2</b><span>打开微信聊天，自主选择发送对象</span></div><div class="social-guide-step"><b>3</b><span>好友扫码，了解并自愿参与</span></div>{btn('我知道了','gold')}</div><p class="social-guide-footnote">不强制分享，不要求选择指定好友</p></div>'''
    screens.append(screen(35,'分享给好友',guidebase+guide,classes='social-guide'))

    friends=f'''<div class="social-friends-top"><div><span>朋友加入，让快乐更多一点</span><h1>我的好友</h1></div><span class="social-friends-icon">{ic('friend',35)}</span></div><div class="social-friend-total"><span>已归属好友</span><b>12<small> 位</small></b><p>仅显示与你建立邀请关系的好友</p></div><div class="social-friend-tabs"><b>好友记录</b><span>按加入时间展示</span></div><div class="social-friend-list">'''
    for name,avatarname,date,note in [('阿宁','宁','11月03日','刚刚加入'),('小林','林','11月02日','已加入元享'),('暖暖','暖','11月01日','已加入元享'),('小满','满','10月31日','已加入元享'),('阿泽','泽','10月29日','已加入元享')]:
        friends+=f'<div class="social-friend-item"><span class="social-friend-avatar">{avatarname}</span><div><b>{name}</b><small>{date} 加入</small></div><span>{note}</span></div>'
    friends+=f'''</div>{notice('好友信息按实际邀请归属展示，昵称已适度脱敏。')}<div class="social-friend-invite">{ic('share',19)}<b>还有好朋友，想邀请来看看？</b>{ic('arrow',15)}</div>'''
    screens.append(screen(36,'我的好友',friends,footer=btn('继续邀请好友'),classes='social-friends-screen'))

    profile=f'''<div class="social-mine-stage"><div class="social-mine-account"><span class="avatar">{ic('user',31)}</span><div><h2>小林</h2><span>个人资料 {ic('arrow',12)}</span></div><span class="social-mine-setting">{ic('settings',22)}</span></div><div class="social-mine-wallet"><div><span>我的金币</span><span>收支明细 {ic('arrow',13)}</span></div><b>2,680<small>金币</small></b><p>每一点积累，都清楚可查。</p><div class="social-mine-wallet-foot"><span>{ic('gift',17)} 去挑一份喜欢的好礼</span>{ic('arrow',17)}</div></div><div class="social-mine-orbit"></div></div>'''
    actions=''.join(f'<div><span>{ic(i,24)}</span><b>{t}</b></div>' for i,t in [('check','每日签到'),('play','广告赚币'),('gift','金币兑换'),('bag','商品试用'),('friend','邀请好友')])
    body=f'''{profile}<div class="social-mine-body"><div class="social-mine-actions">{actions}</div><div class="social-mine-record-head"><h3>我的记录</h3><span>每一次期待，都有记录</span></div><div class="social-mine-records"><div><span>{ic('order',27)}</span><b>兑换记录</b><small>订单与物流</small>{ic('arrow',16)}</div><div><span>{ic('bag',27)}</span><b>试用记录</b><small>报名与中选结果</small>{ic('arrow',16)}</div></div><div class="card social-mine-menu">{row('friend','我的好友','与你一起发现元享','12 位')}{row('location','收货地址')}{row('bell','签到提醒','由你自主订阅')}{row('headset','帮助与客服')}{row('shield','设置与隐私')}</div><p class="social-mine-end">元享 · 每天都有小惊喜</p></div>'''
    screens.append(screen(37,'我的',body,tab='我的',back=False,classes='social-mine flush red-nav'))

    edit=f'''<div class="social-profile-title"><span class="social-title-kicker">做喜欢的自己</span><h1>你的元享，<br>由你定义。</h1></div><div class="social-profile-avatar"><span class="avatar">{ic('user',43)}</span><span class="social-avatar-camera">{ic('photo',18)}</span><b>更换头像</b><small>头像由你自主选择</small></div><div class="card social-profile-fields"><label class="form-label">昵称</label><div class="field">小林{ic('edit',18)}</div><p class="muted">使用你喜欢的名字，2–20个字符。</p></div><div class="social-profile-note">{ic('shield',20)}<span>头像和昵称均为选填，<br>不影响签到、赚金币和商品兑换。</span></div>'''
    screens.append(screen(38,'个人资料',edit,footer=btn('保存昵称'),classes='social-profile'))

    settings=f'''<div class="social-settings-heading"><span>{ic('shield',32)}</span><div><h1>安心享，放心用。</h1><p>权限与资料，都由你自己决定。</p></div></div>{section('微信权限')}<div class="card social-settings-card">{row('shield','微信授权管理','在微信原生设置中查看与管理')}{row('photo','头像与昵称','自主完善个人资料')}{row('location','收货地址','仅在兑换或中选后填写')}</div>{section('提醒与帮助')}<div class="card social-settings-card">{row('bell','签到提醒','自主订阅下一次微信提醒')}{row('help','参与规则','签到、广告、兑换、试用、邀请')}{row('headset','联系微信客服','问题与反馈，随时告诉我们')}</div><div class="social-settings-brand"><span>享</span><b>元享</b><p>每一份信任，认真对待。</p></div>'''
    screens.append(screen(39,'设置',settings,classes='social-settings'))

    faq=f'''<div class="social-help-stage"><span class="social-stage-label">元享帮助中心</span><h1>每一步，<br>都为你说明白。</h1><div>{ic('headset',80)}</div></div><div class="social-help-categories"><span class="active">全部问题</span><span>金币</span><span>兑换</span><span>试用</span></div><div class="social-faq"><div class="social-faq-open"><h3><span>01</span>看完广告，金币什么时候到账？</h3><p>自愿完整观看后，系统会核验本次奖励。以金币明细中的实际到账为准；提前关闭不发放本次奖励。</p><span class="social-faq-tip">状态核验中？稍后刷新金币明细。</span></div>'''
    for no,q in [('02','每天签到的金币都一样吗？'),('03','兑换商品需要准备什么？'),('04','申请试用就一定能中选吗？'),('05','邀请好友后会立即获得奖励吗？')]:
        faq+=f'<div class="social-faq-row"><span>{no}</span><b>{q}</b>{ic("arrow",14)}</div>'
    faq+='</div><div class="social-help-more"><b>还没有找到答案？</b><span>微信客服会协助你核对具体情况</span></div>'
    screens.append(screen(40,'帮助与规则',faq,footer=btn(ic('headset',20)+' 联系微信客服'),classes='social-help'))
    return screens

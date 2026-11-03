"""Twelve fresh retail, order and address design drawings. No app/source imports."""
from ui import *


def product_summary(kind='cup', title='日常陶瓷马克杯', cost='1,800', subtitle='温润奶白 · 350mL'):
    return f'<div class="cm-product-row"><div class="cm-mini-product">{product(kind)}</div><div><b>{title}</b><span>{subtitle}</span><strong>{cost} <small>金币 · 1件</small></strong></div></div>'


def address_block(selected=False, name='林女士', phone='138****8000', detail='上海市徐汇区 · 演示收货地址', is_default=True):
    tick=f'<span class="cm-radio {"selected" if selected else ""}">{ic("yes",14) if selected else ""}</span>' if selected is not None else f'<span class="cm-edit">{ic("edit",19)}</span>'
    return f'<div class="cm-address-row">{tick}<div><div><b>{name}</b><span>{phone}</span>{tag("默认") if is_default else ""}</div><p>{detail}</p></div></div>'


def order_hero(status, subtitle, icon='package'):
    return f'<div class="cm-order-hero"><span class="cm-order-halo"></span><div><span class="hero-kicker">元享好礼 · 我的兑换</span><h1>{status}</h1><p>{subtitle}</p></div><span class="cm-order-symbol">{ic(icon,59)}</span></div>'


def build():
    pages=[]
    p17=f'''<div class="cm-photo-stage"><span class="cm-photo-stamp">元享好礼</span>{product('cup')}<div class="cm-photo-label">1 / 3</div></div>
    <div class="cm-product-info"><div class="cm-cost"><strong>1,800</strong><span>金币</span><small>库存 28 件</small></div><h1>日常陶瓷马克杯</h1><p class="muted">一杯温热，装下每天的小美好。</p><div class="cm-can-redeem">{ic('yes',16)}我的金币 2,680 <b>当前可兑换</b></div></div>
    <div class="card cm-address-select"><span>{ic('location',22)}</span><div><b>林女士　138****8000</b><p>上海市徐汇区 · 演示收货地址</p></div>{ic('arrow',15)}</div>
    <div class="cm-service-grid"><div>{ic('shield',19)}兑换信息可查</div><div>{ic('order',19)}订单进度可查</div></div>
    {section('商品详情')}<div class="card cm-detail-copy"><h3>日常里的温柔手感</h3><p>温润釉面，简洁杯型。商品规格、材质与配送规则，以实际商品说明为准。</p><div class="cm-detail-product">{product('cup')}</div></div>'''
    pages.append(screen(17,'好礼详情',p17,footer=f'<div class="footer-price"><b>1,800</b><span>金币</span></div>{btn("立即兑换")}',classes='cm-detail'))

    p18=f'''<div class="cm-confirm-background"><div class="cm-photo-stage">{product('cup')}</div><h2>日常陶瓷马克杯</h2><div class="cm-cost"><strong>1,800</strong><span>金币</span></div></div><div class="cm-confirm-scrim"></div><div class="cm-confirm-sheet"><div class="cm-sheet-heading"><div><span>再确认一次，就能带走喜欢。</span><h2>确认兑换</h2></div>{ic('close',21)}</div>{product_summary()}
    <div class="cm-confirm-money">{info_line('当前金币','2,680')}{info_line('本次扣除','−1,800')}{info_line('兑换后剩余','880 金币','total')}</div>
    <div class="cm-sheet-address"><span>{ic('location',21)}</span><div><b>林女士　138****8000</b><p>上海市徐汇区 · 演示收货地址</p></div><span>修改</span></div><p class="cm-confirm-note">请核对商品、收货信息与兑换规则。<br>提交后可在兑换记录查看处理进度。</p>{btn('确认扣除 1,800 金币')}<div class="small-link">暂不兑换</div><i class="home-indicator"></i></div>'''
    pages.append(screen(18,'确认兑换',p18,classes='cm-confirm-page'))

    p19=f'''<div class="cm-success-banner"><div class="cm-success-coin">{coin_art()}</div><span class="cm-spark s1">✦</span><span class="cm-spark s2">✧</span><div class="cm-result-check">{ic('yes',22)}</div><h1>兑换申请已提交</h1><p>你的每一点积累，都有了新期待。</p></div><div class="cm-ticket"><div class="cm-ticket-heading"><span>本次兑换</span>{tag('处理中')}</div>{product_summary()}<div class="cm-ticket-divider"></div>{info_line('已扣除金币','1,800 金币')}{info_line('当前余额','880 金币')}<p class="muted">后续处理进度，请在兑换记录中查看。</p></div><div class="cm-result-actions">{btn('查看兑换记录')}{btn('继续挑选好礼','secondary')}</div><div class="cm-help-line">{ic('headset',16)}需要帮助？联系客服</div>'''
    pages.append(screen(19,'兑换结果',p19,classes='cm-result-page'))

    p20=f'''<div class="cm-shortfall-hero"><span class="hero-kicker">离心仪好礼，又近了一点</span><h1>再攒 <b>1,120</b> 金币<br>就够兑换了</h1><div class="cm-shortfall-product">{product('cup')}</div></div><div class="cm-target-card"><span>日常陶瓷马克杯</span><div><strong>680</strong><span>/ 1,800 金币</span></div><div class="progress-track"><div class="progress-fill" style="width:38%"></div></div><p>当前金币 680 · 还差 1,120 金币</p></div>{section('今天可以继续积累')}<div class="card cm-earn-path"><div class="cm-earn-icon">{ic('check',24)}</div><div><b>每日签到</b><p>今日签到可领 25 金币</p></div><span>去签到 {ic('arrow',14)}</span></div><div class="card cm-earn-path"><div class="cm-earn-icon">{ic('play',24)}</div><div><b>自愿看广告</b><p>每次 +2 金币 · 剩余 3 次</p></div><span>去观看 {ic('arrow',14)}</span></div>{notice('奖励按实际规则到账。先积累，再兑换喜欢。')}'''
    pages.append(screen(20,'金币还差一点',p20,footer=btn('去赚金币'),classes='cm-shortfall-page'))

    p21=f'''<div class="cm-record-heading"><span>每一份好礼，都有记录</span><h1>我的兑换</h1><div class="cm-record-icon">{ic('order',43)}</div></div><div class="cm-record-sub"><span>全部兑换记录</span><small>按提交时间排序</small></div><div class="cm-order-card"><div class="cm-order-top"><span>11月03日 09:12</span>{tag('处理中')}</div>{product_summary()}<div class="cm-order-bottom"><span>合计 <b>1,800 金币</b></span><span>查看订单 {ic('arrow',14)}</span></div></div><div class="cm-order-card"><div class="cm-order-top"><span>10月28日 18:36</span>{tag('已发货','gold-tag')}</div>{product_summary('bottle','随行真空保温杯','1,800','磨砂银 · 450mL')}<div class="cm-order-bottom"><span>合计 <b>1,800 金币</b></span><span>查看物流 {ic('arrow',14)}</span></div></div><div class="cm-record-end">记录到底了，去发现下一份喜欢。</div>{btn('继续发现好礼','outline')}'''
    pages.append(screen(21,'兑换记录',p21,classes='cm-record-page'))

    p22=f'''{order_hero('正在处理中','申请已收到，后续进度会在订单中更新。','package')}<div class="card cm-order-address"><span>{ic('location',23)}</span><div><b>林女士　138****8000</b><p>上海市徐汇区 · 演示收货地址</p></div></div><div class="cm-order-detail-card">{product_summary()}<div class="cm-ticket-divider"></div>{info_line('兑换数量','1 件')}{info_line('扣除金币','1,800 金币')}{info_line('订单状态','处理中')}</div>{section('订单信息')}<div class="card cm-order-meta">{info_line('订单编号','YX2026110300128 '+ic('copy',14))}{info_line('提交时间','2026-11-03 09:12')}{info_line('收货方式','寄送实物商品')}</div>{notice('实际处理与配送安排，请查看商品规则或联系客服。')}'''
    pages.append(screen(22,'订单详情',p22,footer=btn(ic('headset',20)+' 联系客服','secondary'),classes='cm-order-detail'))

    p23=f'''{order_hero('好礼已发出','快递公司与单号已更新，去看看配送信息。','van')}<div class="cm-shipping-link"><span class="cm-shipping-icon">{ic('van',29)}</span><div><b>顺丰速运</b><p>SF＊＊＊＊＊＊＊＊0862</p></div><span>物流信息 {ic('arrow',15)}</span></div><div class="card cm-order-address"><span>{ic('location',22)}</span><div><b>林女士　138****8000</b><p>上海市徐汇区 · 演示收货地址</p></div></div><div class="cm-order-detail-card">{product_summary('bottle','随行真空保温杯','1,800','磨砂银 · 450mL')}<div class="cm-ticket-divider"></div>{info_line('扣除金币','1,800 金币')}{info_line('提交时间','2026-10-28 18:36')}{info_line('订单编号','YX2026102800086')}</div>{notice('请在实际收到商品并确认无误后，再确认收货。')}'''
    pages.append(screen(23,'订单详情',p23,footer=btn('联系客服','outline')+btn('确认收货'),classes='cm-order-detail'))

    p24=f'''<div class="cm-logistics-banner"><div><span>好礼配送信息</span><h1>好礼在路上</h1><p>通过快递公司查询配送详情</p></div><div>{ic('van',61)}</div></div><div class="cm-waybill"><div class="cm-waybill-top"><div class="cm-courier-emblem">顺丰</div><div><h2>顺丰速运</h2><span>订单配送信息</span></div></div><div class="cm-waybill-code"><span>快递单号</span><b>SF＊＊＊＊＊＊＊＊0862</b></div>{btn(ic('copy',19)+' 复制快递单号','secondary')}</div><div class="card cm-logistics-recipient"><span>收货信息</span><b>林女士　138****8000</b><p>上海市徐汇区 · 演示收货地址</p></div><div class="cm-logistics-note">{ic('info',20)}<div><b>如何查看最新配送进度？</b><p>复制快递单号，前往对应快递公司官方渠道查询。</p></div></div>{section('配送商品')}<div class="card">{product_summary('bottle','随行真空保温杯','1,800','磨砂银 · 450mL')}</div><div class="small-link">配送有疑问？联系客服</div>'''
    pages.append(screen(24,'物流信息',p24,classes='cm-logistics-page'))

    p41=f'''<div class="cm-address-heading"><div><span>让好礼，准确送到你手里</span><h1>我的收货地址</h1></div><div>{ic('location',39)}</div></div><div class="cm-address-item">{address_block(None)}<div class="cm-address-actions"><span>{ic('yes',14)}默认地址</span><span>{ic('edit',15)}编辑</span></div></div><div class="cm-address-item">{address_block(None,'林女士','138****8000','浙江省杭州市 · 演示备用地址',False)}<div class="cm-address-actions"><span class="muted">设为默认</span><span>{ic('edit',15)}编辑</span></div></div><div class="cm-address-privacy">{ic('shield',19)}<p>地址按账户保存在当前设备，<br>仅用于兑换或试用中选后的收货。</p></div>'''
    pages.append(screen(41,'收货地址',p41,footer=btn(ic('location',20)+' 新增收货地址'),classes='cm-address-page'))

    p42=f'''<div class="cm-edit-intro"><h1>把好礼，送到这里。</h1><p>请填写可以联系到你的收货信息。</p></div><div class="card cm-address-form"><span class="form-label">收货人</span><div class="field">林女士</div><span class="form-label">手机号码</span><div class="field">138 0000 8000</div><span class="form-label">所在地区</span><div class="field">上海市 / 徐汇区{ic('arrow',15)}</div><span class="form-label">详细地址</span><div class="field cm-textarea">演示收货地址，请填写街道与门牌号</div><div class="cm-default-switch"><div><b>设为默认收货地址</b><span>下次兑换时优先选择</span></div><i class="switch"></i></div></div><div class="cm-form-note">{ic('shield',18)}<p>收货信息仅用于本次寄送与地址管理，<br>请核对姓名、手机号码和详细地址。</p></div>'''
    pages.append(screen(42,'编辑收货地址',p42,footer=btn('保存收货地址'),classes='cm-address-edit'))

    p43=f'''<div class="cm-choose-title"><h1>选择收货地址</h1><p>本次好礼将寄送至你选择的地址。</p></div><div class="cm-address-item selected-address">{address_block(True)}<div class="cm-selected-tag">本次使用</div></div><div class="cm-address-item">{address_block(False,'林女士','138****8000','浙江省杭州市 · 演示备用地址',False)}</div><div class="cm-native-address"><span>{ic('location',26)}</span><div><b>使用微信收货地址</b><p>从微信已有地址中选择</p></div>{ic('arrow',16)}</div><div class="cm-manual-address">{ic('edit',19)}新增收货地址</div><div class="cm-selection-note">{ic('shield',19)}<p>确认后可返回兑换页面，<br>再次核对商品与扣除金币。</p></div>'''
    pages.append(screen(43,'选择地址',p43,footer=btn('使用此收货地址'),classes='cm-address-choose'))

    p44=f'''<div class="cm-empty-address-art"><span class="cm-empty-orbit"></span><div class="cm-envelope"><div></div><span>{ic('location',57)}</span></div><span class="cm-empty-spark one">✦</span><span class="cm-empty-spark two">✧</span></div><div class="cm-empty-address-title"><span>为喜欢，留一个收货位置</span><h1>还没有收货地址</h1><p>添加地址后，兑换和试用中选的好礼，<br>就知道该送往哪里了。</p></div><div class="cm-empty-address-actions">{btn(ic('location',20)+' 使用微信收货地址')}{btn(ic('edit',18)+' 手动新增地址','secondary')}</div><div class="cm-empty-address-privacy">{ic('shield',18)}<p>地址保存在当前设备<br>填写地址不代表已获得试用商品</p></div>'''
    pages.append(screen(44,'添加收货地址',p44,classes='cm-address-empty'))
    return pages

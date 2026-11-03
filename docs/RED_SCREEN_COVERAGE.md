# 48个红金设计状态覆盖

48张已确认设计对应页面、页内状态及微信原生界面，保留原48个注册路由。下面是源码映射，不代表微信编译、真机、真实后台或原生SDK联调已通过。所有正式数据使用真实接口；预览演示数据隔离。

路由均位于 `sage_dksy/pages/`；对应的 WXML 和 JS 为实现证据。广告观看画面与微信好友选择由微信原生SDK提供；物流只显示真实承运商及单号。

| 设计 | 界面或状态 | 实际路由 | 状态或触发条件 |
|---|---|---|---|
| 01 | 首页 | `index/index` | 首页加载后的真实账户、签到、商品与试用数据 |
| 02 | 赚金币 | `v14/tasks/index` | rewardViewMode 为 tasks |
| 03 | 金币商城 | `prize/index` | 商品列表及当前已加载范围筛选 |
| 04 | 商品试用 | `trial/trial` | 真实活动状态筛选及报名入口 |
| 05 | 每日签到 | `v14/sign/index` | 正常签到状态，recordsVisible 与 justSigned 关闭 |
| 06 | 签到成功 | `v14/sign/index` | 签到接口成功后 justSigned |
| 07 | 签到记录 | `v14/sign/index` | recordsVisible；真实账本筛出的记录与日历 |
| 08 | 签到提醒 | `v14/reminders/index` | 主动发起订阅；实际配置和原生权限 |
| 09 | 广告奖励说明 | `v14/tasks/index` | rewardViewMode 为 offer |
| 10 | 激励视频观看 | `v14/tasks/index` | 由原生 rewardedVideoAd 展示；视频画面由微信SDK控制 |
| 11 | 广告奖励到账 | `v14/tasks/index` | rewardViewMode 为 paid；仅服务端确认且奖励金额有效 |
| 12 | 观看未完成 | `v14/tasks/index` | rewardViewMode 为 unpaid；提前关闭不结算 |
| 13 | 我的金币 | `user/integral` | ?view=wallet；viewMode 为 wallet |
| 14 | 全部金币明细 | `user/integral` | viewMode 为 ledger，filter 为 all |
| 15 | 金币收入 | `user/integral` | filter 为 in；仅统计已加载收入 |
| 16 | 金币支出 | `user/integral` | filter 为 out；仅统计已加载支出 |
| 17 | 商品详情 | `prize/prize_show` | 有效商品id；detailView 为 product |
| 18 | 兑换确认 | `prize/prize_show` | 真实库存、余额、地址核对后 confirmVisible |
| 19 | 兑换成功 | `prize/prize_show` | 兑换接口成功后 orderSuccess；余额重新同步 |
| 20 | 金币不足 | `prize/prize_show` | detailView 为 shortfall；实际余额低于实际价格 |
| 21 | 兑换记录 | `user/order` | orderView 为 list；真实订单 |
| 22 | 处理中订单 | `user/order` | orderView 为 detail；detailOrder 实际状态，无物流时不推断发货 |
| 23 | 已发货订单 | `user/order` | orderView 为 detail；detailOrder._hasTracking 与实际状态字段 |
| 24 | 物流信息 | `user/order` | orderView 为 logistics；仅实际承运商和单号，无模拟轨迹 |
| 25 | 试用详情 | `trial/trial_show` | 实际活动id与状态；只有真实开放允许申请 |
| 26 | 试用申请确认 | `trial/trial_input` | 有效活动id，canApply 控制提交 |
| 27 | 试用申请成功 | `trial/trial_input` | 申请接口成功后 applicationSubmitted；不表示中选 |
| 28 | 我的试用 | `user/trial_list` | 真实申请记录；全部申请与已中选筛选 |
| 29 | 试用等待公布 | `user/trial_list` | activeRecord._outcome 为 pending；只认实际状态 |
| 30 | 试用已中选 | `user/trial_list` | activeRecord._outcome 为 selected；can_complete 控制资料入口 |
| 31 | 试用未中选 | `user/trial_list` | activeRecord._outcome 为 unselected；未知状态不推断为未中选 |
| 32 | 收件信息已提交 | `trial/complete/complete` | 有效申请id；提交接口成功后 submitted；历史记录也支持 submitted 结果 |
| 33 | 邀请好友 | `v11/promote` | view 为 hub；实际专属二维码与好友数 |
| 34 | 邀请海报 | `v11/promote` | ?mode=poster；真实二维码与原生Canvas导出 |
| 35 | 微信分享指引 | `v11/promote` | guideOpen；实际 open-type=share，好友选择由微信控制 |
| 36 | 我的好友 | `v132grow/index` | 实际好友列表、分页与失败重试 |
| 37 | 我的 | `user/index` | 真实账户与钱包，五项核心业务入口 |
| 38 | 个人资料 | `user/user/index` | 原生头像昵称选择及实际资料保存 |
| 39 | 设置 | `v17/settings` | 实际权限、资料、提醒、帮助入口 |
| 40 | 帮助与规则 | `v14/rewards/index` | 分类切换、问题展开与客服 |
| 41 | 收货地址管理 | `address/list` | 账户本机地址列表，selectMode 关闭 |
| 42 | 新增或编辑地址 | `address/edit` | 实际地址id编辑或新增；表单校验后保存 |
| 43 | 选择收货地址 | `address/list` | ?mode=select；pendingSelectionId 暂存，onUse 后确认使用 |
| 44 | 无收货地址 | `address/list` | 真实地址列表为空；新增入口 |
| 45 | 加载失败 | `user/order` | 真实首次请求失败且无订单；yx-state error 与 retry；其他主业务页也有独立失败态 |
| 46 | 暂无兑换记录 | `user/order` | 无加载错误且真实订单列表为空；不把加载失败当空 |
| 47 | 广告冷却中 | `v14/tasks/index` | rewardViewMode 为 cool；取实际冷却状态 |
| 48 | 商品已兑完 | `prize/prize_show` | detailView 为 soldout；真实库存不足 |

机器可读版本见 [page-coverage.json](page-coverage.json)。14个代表状态的实际代码浏览器预览见 [preview/README.md](preview/README.md)。结果状态依赖真实后端字段，不能通过客户端任意切换来代替业务成功。

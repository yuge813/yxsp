# 隔离数据库回归

这些是交付源码的可审计测试，不部署到公开站点，不连接生产数据库。报告：核心33项、管理员17项、反引号表名安装1项，合计51项；另有留存自然日SQL10项回归。测试签名密钥、账号及默认数据库密码均为明确的合成测试值。

测试适配器仅模拟微擎框架接口，余额、金币流水、奖励、预算、行锁和并发均由实际PDO + MariaDB InnoDB执行。`production-host.php`加载完整wxapp.php并使用合成签名测试真实普通签到接口。

## 本地重现

1. 在本地临时目录准备**完整的现有addons/sage_dksy副本**并覆盖增量补丁。增量包不包含已有的所有依赖trait，所以这一步必须使用原有完整插件；不要将完整站点配置或证书提交到Git。
2. 安装Docker，使用本目录Dockerfile构建PHP镜像：`docker build -t yx-referral-php:local -f backend_patch/qa/Dockerfile .`。
3. 创建只供测试使用的内部Docker网络 `yx-referral-it`，运行 `mariadb:11.4`，容器名 `yx-referral-db`，数据库 `yx_referral_test`，root密码设为 `local-only-referral-it-20261104`。不要映射公开端口。等数据库健康检查通过。
4. 将本目录可写挂载到容器`/work/qa`，完整插件副本只读挂载到`/work/addons/sage_dksy`，在上述内部网络上使用PHP镜像依次执行：

```sh
php /work/qa/run.php
php /work/qa/admin-run.php
php /work/qa/admin-run.php --quoted
```

分别产生本目录中的三个JSON报告。切勿并行运行三个runner，它们会重建隔离的 `qa_` 表。测试DSN及用户可用 `YX_QA_DSN/YX_QA_DB_USER/YX_QA_DB_PASS` 指定，**只能指向一次性测试数据库**。

Python自然日SQL回归可直接执行：`python3 backend_patch/qa/retention-date-regression.py`，默认读取配套补丁里的实际SQL；也支持用 `YX_QA_BACKEND_ROOT` 指向完整插件副本。

已验证PHP8.3、MariaDB11.4。不使用生产API、真实微信身份、真实商品订单或真实广告。本地测试不是微信官方编译或真机验收。

预算表单新增浏览器检查：安装Playwright与Chromium后执行 `python3 backend_patch/qa/budget-browser.py`，7项检查验证真实内联脚本、空白/零预算和金额变化后的原生输入约束。

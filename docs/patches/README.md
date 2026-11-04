# 签到提醒覆盖补丁

[下载补丁](yuanxiang-sign-reminder-patch.zip)，解压后将 `sage_dksy` 文件夹覆盖到当前项目根目录，再清除开发者工具缓存并编译。

Console 应显示 `YX-REMINDER-20261104-R1`，用于核对运行文件。对于后台明确的“今天已经订阅”，页面显示“今日已订阅”；Network原始返回码继续由后台决定。

补丁只含提醒页JS/WXML/WXSS/JSON、安装说明与哈希清单。

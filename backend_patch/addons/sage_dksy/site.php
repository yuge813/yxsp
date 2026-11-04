<?php
/**
 * sage_dksy模块微站定义
 *
 * @author heyuguo0619
 * @url
 */
global $_W;
defined('IN_IA') or exit('Access Denied');
define('POSETERH_ROOT',IA_ROOT.'/addons/sage_dksy/');
define('POSETERH_URL',$_W['siteroot'].'addons/sage_dksy/');
define('MODULE','sage_dksy');
require_once(POSETERH_ROOT.'class/autoload.php');
class Sage_dksyModuleSite extends WeModuleSite {

    /** Real first-level referral campaign admin; permission checks live in controller. */
    public function doWebReferral150() {
        defined('IN_IA') or exit('Access Denied');
        $level = ob_get_level();
        ob_start();
        try {
            $controller = __DIR__ . '/inc/web/referral150.inc.php';
            if (!is_file($controller)) throw new \RuntimeException('referral controller missing');
            require $controller;
            echo ob_get_clean();
        } catch (\Throwable $error) {
            while (ob_get_level() > $level) { @ob_end_clean(); }
            error_log('[YX150 ADMIN] route failed ' . get_class($error));
            echo '<main style="padding:40px;font:16px sans-serif">邀请奖励管理暂时不可用，请维护者核对部署文件与服务器日志。</main>';
        }
    }

    /** V10_ROUTE_DIAGNOSTIC_20261029 - staging-only temporary trace, remove after diagnosis. */
    public function doWebV10() {
        global $_W, $_GPC;
        if (empty($_W['uid'])) { exit('Access Denied'); }
        $diagPath = sys_get_temp_dir() . '/yx_v10_route_diag_20261029.log';
        $trace = function($status, $detail = '') use ($diagPath) {
            if (@file_exists($diagPath) && @filesize($diagPath) > 131072) { return; }
            $line = date('Y-m-d H:i:s') . ' ' . $status;
            if ($detail !== '') { $line .= ' ' . str_replace(array("\r", "\n"), ' ', substr($detail, 0, 360)); }
            @file_put_contents($diagPath, $line . "\n", FILE_APPEND | LOCK_EX);
        };
        $trace('ENTER_V10 uid_present=1 uniacid_positive=' . (!empty($_W['uniacid']) ? '1' : '0'));
        register_shutdown_function(function() use ($trace) {
            $err = error_get_last();
            if (is_array($err) && in_array($err['type'], array(E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR,E_USER_ERROR), true)) {
                $trace('FATAL type=' . (int)$err['type'] . ' file=' . basename((string)$err['file']) . ' line=' . (int)$err['line'], (string)$err['message']);
            } else { $trace('SHUTDOWN_NORMAL'); }
        });
        $v10File = POSETERH_ROOT . 'inc/web/v10.inc.php';
        if (!is_file($v10File)) { $trace('V10_CONTROLLER_MISSING'); return; }
        $trace('BEFORE_V10_CONTROLLER');
        try {
            require $v10File;
            $trace('AFTER_V10_CONTROLLER');
        } catch (\Throwable $err) {
            $trace('THROWABLE class=' . get_class($err) . ' file=' . basename($err->getFile()) . ' line=' . $err->getLine(), $err->getMessage());
            http_response_code(500);
            echo 'V10 后台发生服务器异常。请检查测试站私有诊断日志。';
        }
    } // V10_ROUTE_DIAGNOSTIC_20261029


    /** YX_V13_WHITE_SCREEN_EMERGENCY_20261101
     * Emergency safety fallback: V13 dashboard is temporarily bypassed.
     * Preserve other site routes and all business logic; no DB writes.
     * Uses the existing, working V12 administration dashboard.
     */
    public function doWebOps() {
        defined('IN_IA') or exit('Access Denied');
        global $_W;
        // Do not expose a module entry without a We7 authenticated session.
        if (empty($_W['uid']) || empty($_W['uniacid'])) {
            exit('Access Denied');
        }
        $url = $this->createWebUrl('v12', array('pane' => 'dashboard'));
        if (is_string($url) && $url !== '') {
            if (!headers_sent()) {
                header('Location: ' . html_entity_decode($url, ENT_QUOTES, 'UTF-8'), true, 302);
                exit;
            }
            // If We7 output already started, present an ordinary working link.
            echo '<div style="font:16px/1.7 sans-serif;padding:32px">新版运营总览暂时停用。'
                . '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">点击进入原有运营后台</a></div>';
            return;
        }
        echo '运营后台入口暂不可用，请从微擎菜单进入“内容管理”。';
    }

    /** V13.0.2 safe, isolated read-only preview. Existing do=ops remains V12 fallback. */
    public function doWebOps13() {
        defined('IN_IA') or exit('Access Denied');
        global $_W;
        if (empty($_W['uid']) || empty($_W['uniacid'])) {
            exit('Access Denied');
        }
        // Buffer the isolated preview so exceptions never leave a half-rendered blank page.
        $yx13Level = ob_get_level();
        ob_start();
        try {
            require __DIR__ . '/inc/web/ops13.inc.php';
            $yx13Html = ob_get_clean();
            if (trim($yx13Html) === '') {
                throw new \RuntimeException('empty preview output');
            }
            echo $yx13Html;
        } catch (\Throwable $yx13Error) {
            while (ob_get_level() > $yx13Level) { @ob_end_clean(); }
            error_log('[YX V13.0.2] preview failed: ' . get_class($yx13Error)
                . ' @ ' . basename($yx13Error->getFile()) . ':' . (int)$yx13Error->getLine());
            $yx13Back = $this->createWebUrl('ops');
            echo '<div style="font:16px/1.8 sans-serif;max-width:640px;padding:40px;margin:40px auto">'
                . '<strong>新版运营总览暂时不可用，原后台不受影响。</strong><p>请先使用原有后台。</p>'
                . '<a href="' . htmlspecialchars((string)$yx13Back, ENT_QUOTES, 'UTF-8') . '">进入稳定后台</a></div>';
        }
    }

    /** YX_V1303_READONLY_CONTROL: isolated ads & reward overview; no settings writes. */
    public function doWebControl13() {
        defined('IN_IA') or exit('Access Denied');
        global $_W;
        if (empty($_W['uid']) || empty($_W['uniacid'])) { exit('Access Denied'); }
        $startLevel = ob_get_level();
        ob_start();
        try {
            require __DIR__ . '/inc/web/control13.inc.php';
            $viewHtml = ob_get_clean();
            if (trim($viewHtml) === '') { throw new \RuntimeException('empty control view'); }
            echo $viewHtml;
        } catch (\Throwable $ex) {
            while (ob_get_level() > $startLevel) { @ob_end_clean(); }
            error_log('[YX V13.0.3] control read-only error: '.get_class($ex).' @ '.basename($ex->getFile()).':'.(int)$ex->getLine());
            $returnUrl = $this->createWebUrl('ops13');
            echo '<main style="max-width:680px;margin:60px auto;padding:30px;font:16px/1.7 sans-serif"><h2>管理数据暂不可用</h2><p>新管理页出现异常，原后台与数据均未修改。</p><a href="'.htmlspecialchars((string)$returnUrl,ENT_QUOTES,'UTF-8').'">返回稳定运营总览</a></main>';
        }
    }


    /** V13.0.4: isolated READ-ONLY users/orders. Existing V12 edit flows untouched. */
    public function doWebManage13() {
        defined('IN_IA') or exit('Access Denied');
        global $_W;
        if (empty($_W['uid']) || empty($_W['uniacid'])) { exit('Access Denied'); }
        $level = ob_get_level();
        ob_start();
        try {
            require __DIR__ . '/inc/web/manage13.inc.php';
            $html = ob_get_clean();
            if (trim($html)==='') throw new \RuntimeException('empty management view');
            echo $html;
        } catch (\Throwable $ex) {
            while (ob_get_level()>$level) { @ob_end_clean(); }
            error_log('[YX V13.0.4] manage read-only '.get_class($ex).' @ '.basename($ex->getFile()).':'.(int)$ex->getLine());
            $url=$this->createWebUrl('ops13');
            echo '<main style="max-width:650px;margin:60px auto;padding:30px;font:16px/1.8 sans-serif">'
               . '<h2>管理数据暂时不可用</h2><p>新界面发生异常，原后台与业务数据未更改。</p>'
               . '<a href="'.htmlspecialchars((string)$url,ENT_QUOTES,'UTF-8').'">返回稳定运营总览</a></main>';
        }
    }

    /** V13.0.5 independent READ-ONLY products/messages manager. Legacy write routes unchanged. */
    public function doWebCatalog13() {
        defined('IN_IA') or exit('Access Denied');
        global $_W;
        if (empty($_W['uid']) || empty($_W['uniacid'])) { exit('Access Denied'); }
        $level = ob_get_level();
        ob_start();
        try {
            require __DIR__ . '/inc/web/catalog13.inc.php';
            $html = ob_get_clean();
            if (trim($html) === '') throw new \RuntimeException('empty catalog view');
            echo $html;
        } catch (\Throwable $ex) {
            while (ob_get_level() > $level) { @ob_end_clean(); }
            error_log('[YX V13.0.5] catalog read '.get_class($ex).' @ '.basename($ex->getFile()).':'.(int)$ex->getLine());
            $back=$this->createWebUrl('ops13');
            echo '<main style="max-width:680px;margin:60px auto;padding:28px;font:16px/1.7 sans-serif">'
               . '<h2>当前管理数据暂不可用</h2><p>原有商品、订阅消息及其他业务数据没有更改。</p>'
               . '<a href="'.htmlspecialchars((string)$back,ENT_QUOTES,'UTF-8').'">返回运营总览</a></main>';
        }
    }

    /** V13.0.6: explicit, narrow admin write workflows; V12 business routes remain untouched. */
    public function doWebWork13() {
        defined('IN_IA') or exit('Access Denied');
        global $_W;
        if (empty($_W['uid']) || empty($_W['uniacid'])) { exit('Access Denied'); }
        $level = ob_get_level();
        ob_start();
        try {
            require __DIR__ . '/inc/web/work13.inc.php';
            $out = ob_get_clean();
            if (trim($out)==='') throw new \RuntimeException('empty work13 view');
            echo $out;
        } catch (\Throwable $err) {
            while (ob_get_level() > $level) { @ob_end_clean(); }
            error_log('[YX V13.0.6] work13 error @ '.basename($err->getFile()).':'.(int)$err->getLine());
            $back = $this->createWebUrl('ops13');
            echo '<main style="font:16px/1.8 sans-serif;max-width:700px;margin:60px auto">'
               . '<h2>操作页面暂时不可用</h2><p>原后台未受影响，业务数据未因页面加载异常而清空。</p>'
               . '<a href="'.htmlspecialchars((string)$back,ENT_QUOTES,'UTF-8').'">返回稳定后台</a></main>';
        }
    }

    /* YX_V122315_REWARD_MENU: standalone We7 menu route. Owner check is still in v12 controller. */
    public function doWebReward() {
        defined('IN_IA') or exit('Access Denied');
        global $_GPC;
        $_GPC['pane'] = 'reward';
        require __DIR__ . '/inc/web/v12.inc.php';
    }

    /* YX_V12224_EXPLICIT_V12_ROUTE：仅用于 V12 后台管理路由 */
    public function doWebV12() {
        defined('IN_IA') or exit('Access Denied');
        if (!defined('POSETERH_ROOT')) {
            define('POSETERH_ROOT', __DIR__ . DIRECTORY_SEPARATOR);
        }
        require __DIR__ . '/inc/web/v12.inc.php';
    }
    /**
     * V13.2.1 只修复增长后台空白页与只读诊断；不碰任何业务写入接口。
     * 如果增长模块异常，显示HTML回退页，不返回会被Nginx拦截的503。
     */
    public function doWebGrowth13() {
        defined('IN_IA') or exit('Access Denied');
        global $_W;
        $uid = (int) ($_W['uid'] ?? 0);
        $uniacid = (int) ($_W['uniacid'] ?? 0);
        $role = (string) ($_W['role'] ?? '');
        $isOwner = !empty($_W['isfounder']) || $role === 'owner';
        $canView = $isOwner || $role === 'manager';
        $esc = static function($value) {
            return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
        };
        $back = $this->createWebUrl('ops13');
        $intro = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>元享 · 增长后台</title></head><body style="background:#f7f8fa;color:#232832;font:16px/1.75 sans-serif">'
            .'<main style="max-width:740px;margin:9vh auto;padding:28px;background:white;border:1px solid #eaedf0;border-radius:12px">';
        $foot = '<p><a style="color:#a10f32" href="'.$esc($back).'">返回已正常运行的运营总览</a></p></main></body></html>';
        if (!$uid || !$uniacid) {
            // 不披露站点配置；维持原有登录校验。
            echo $intro.'<h2>需要重新登录微擎后台</h2><p>当前会话未取得有效管理身份。</p>'.$foot;
            return;
        }
        if (!$canView) {
            echo $intro.'<h2>没有管理权限</h2><p>请使用该站点的所有者或经理账号打开。</p>'.$foot;
            return;
        }
        $module = __DIR__.'/inc/web/growth13.inc.php';
        // 只允许已经登录且拥有管理权限的用户查询，不返回SQL或绝对路径。
        if (isset($_GET['yx132_check']) && (string)$_GET['yx132_check'] === '1') {
            $rows = array(
                'PHP运行版本' => PHP_VERSION,
                '增长控制器文件' => is_file($module) && is_readable($module) ? '存在且可读取' : '缺失或不可读取',
                '数据库函数' => function_exists('pdo_tableexists') && function_exists('tablename') ? '可调用' : '缺失',
                '登录权限' => '站点管理员已认证',
                '增长模式' => '模式A（不在诊断页面发币）'
            );
            foreach (array('user','qian','v11_relation_audit','v132_growth_policy') as $suffix) {
                $name = 'sage_dksy_'.$suffix;
                try {
                    $exists = function_exists('pdo_tableexists') ? pdo_tableexists($name) : false;
                    $rows['数据表 '.$suffix] = $exists ? '存在' : '不存在或无法检查';
                } catch (\Throwable $e) {
                    $rows['数据表 '.$suffix] = '检查异常';
                }
            }
            echo $intro.'<h2>V13.2.1 增长后台只读检查</h2><p>仅检查环境，不修改数据库或金币。</p>';
            echo '<table style="width:100%;border-collapse:collapse">';
            foreach ($rows as $label=>$value) {
                echo '<tr><td style="padding:8px;border-bottom:1px solid #eee">'.$esc($label).'</td>'
                    .'<td style="padding:8px;border-bottom:1px solid #eee">'.$esc($value).'</td></tr>';
            }
            echo '</table><p><a style="color:#a10f32" href="'.$esc($this->createWebUrl('growth13')).'">尝试打开增长管理</a></p>'.$foot;
            return;
        }
        $level = ob_get_level();
        ob_start();
        try {
            if (!is_file($module) || !is_readable($module)) {
                throw new \RuntimeException('growth controller missing');
            }
            require $module;
            $html = ob_get_clean();
            if (!is_string($html) || trim($html) === '') {
                throw new \RuntimeException('growth controller returned empty response');
            }
            echo $html;
        } catch (\Throwable $error) {
            while (ob_get_level() > $level) { @ob_end_clean(); }
            // 只写入服务器PHP日志，不在浏览器中暴露文件路径、SQL或异常内容。
            error_log('[YX1321] growth render: '.get_class($error)
                .' @ '.basename($error->getFile()).':'.(int)$error->getLine()
                .' detail='.substr(str_replace(array("\r","\n"),' ',(string)$error->getMessage()),0,250));
            // 不设置HTTP 503/403，避免Nginx错误页拦截把回退提示变成白屏。
            echo $intro.'<h2>增长管理加载异常</h2>'
                .'<p>原有运营后台、金币、广告和订单功能不受此页影响。</p>'
                .'<p>请打开 <a style="color:#a10f32" href="'.$esc($this->createWebUrl('growth13',array('yx132_check'=>1))).'">只读环境检查</a>，'
                .'并在宝塔PHP错误日志搜索 <code>[YX1321]</code>。</p>'.$foot;
        }
    }

    /** V14.2: authenticated scheduler for one-time, opt-in sign reminders only. */
    public function doMobileDy() {
        defined('IN_IA') or exit('Access Denied');
        require __DIR__ . '/inc/mobile/dy.inc.php';
    }

}
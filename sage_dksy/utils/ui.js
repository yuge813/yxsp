'use strict';
// Display helpers only. Eligibility and balances always come from the server.
function amount(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?Math.floor(n):null;}
function number(value){const n=amount(value);return n===null?'—':String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function message(value,fallback){const raw=String(value&&value.message||value&&value.errMsg||value||'');if(/timeout|timed out/i.test(raw))return '连接有点慢，请稍后重试';if(/login|登录|认证|会话|token|openid/i.test(raw))return '登录连接已失效，请重新连接';return fallback||'暂时连接不上，请重试';}
module.exports={amount,number,message};

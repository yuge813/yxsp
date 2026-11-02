# 元享 UI implementation contract

User has now explicitly authorized full development, superseding the earlier design-only gate. Work in the existing /workspace/yxsp checkout. Original attachment remains unchanged in /workspace/scratch/sage_ui_review.

## Direction

Modern Chinese lifestyle rewards brand: warm ivory #F5F3ED, ink forest #20352E, persimmon #BF442A as the primary action (#E75B3A is the brighter exploration accent), sage #6F806D, white surfaces #FFFEFA. Brand name 元享. Large confident typography, editorial asymmetry in hero/content, visible actual products, restrained line icons. This is a fresh direction beyond the rejected wine-colored mockups. No demo coins, stock, names, article titles, or product photography in live pages. Empty/loading/error states are real states.

## Shared ownership and components

Root owns app.js/app.json/app.wxss, shared nav include, components, utils/ui*.js, theme/icon assets and packaging. Agents own only their specified page directories/files. Do not edit another agent's files, root files, project.config or old utils without coordination.

Root supplies globally registered `<yx-icon name="gift" tone="ink" size="44"/>`: name home/task/gift/user/check/book/play/arrow/bell/coin/order/friend/heart/location/settings/support/grid/share/search/back/yes/close/leaf/refresh/info/image; tones ink/brand/muted/light/green. size in rpx. PNG sources under resource/ui/. Use actual data imagery for product/cover.

Root supplies global `<yx-state type="loading|error|empty" title="..." description="..." action="重新加载" bindaction="retry"/>`. loading renders skeleton; error/empty renders visible copy and optional action. Do not put fake data into loading state.

Global base styles: ui-page (padding:32rpx, content+safe-area bottom), ui-kicker (24rpx), ui-title (48rpx), ui-lead (28rpx), ui-section-head, ui-card, ui-row, ui-muted, ui-label, ui-primary (96rpx deep persimmon), ui-secondary (92rpx light), ui-text-button (min88rpx), ui-input, ui-error, ui-empty, ui-tag, ui-balance. Local styles may compose these. Replace owned WXSS rather than append more historical overrides; WXSS can use literal colors. Root replaces global historical theme with new system, so pages must own required classes.

Native navigation uses dark text on #F5F3ED globally. Four custom root destinations: index/index, v14/tasks/index, prize/index, user/index. Root rewrites shared nav.wxml and nav.wxss. `thisurl` string must match. Include nav for current root pages; secondary pages may keep inclusion if existing route expects it. No native tabBar/switchTab migration.

## Business boundaries

Keep endpoints, session/safe token, reward channels home/read, ad units and settlement constraints, invitation attribution, address data and existing share behavior. No fabricated API/schema. All new display uses existing fields. Ads stay in normal flow, never overlap footer/tabs. Reward amounts null must remain unknown until valid server config.

Tasks: consent/complete-watch condition explicit; availability drives CTA; cooldown/pending/disabled reflected. Reading itself free. Commerce: lock submit, confirmation before deduction, success leads orders. Monetary truth remains server authoritative. Ready/empty/error distinguish failures, preserve loaded data on retry. Refresh wallet after returning from earning/redeeming.

Source delivery to a new branch of yuge813/yxsp was explicitly authorized by the user after chat attachment delivery proved unavailable. Do not change main or deploy the mini-program. Deliver source, reproducible checks and honest runtime limits.

Final integration: active primary/foreground persimmon normalized to #BF442A for text contrast. Page48 native themes standardized. Original upload retained; all48 templates/styles changed. Browser layout previews use current source and external fixtures only.

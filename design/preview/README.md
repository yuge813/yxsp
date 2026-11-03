# Actual-code browser layout review

The preview reads current registered page WXML and WXSS; it does not use a hand-redrawn HTML replacement. External demonstration data is isolated in `fixtures.json`, and images use the approved red/gold brand assets and a separately stored demonstration product photo sheet under design/preview/fixtures. No fixture is imported by application JS/WXML. The package builder excludes design/preview entirely from the runnable mini-program.

Run from `/workspace/yxsp`:

```sh
mkdir -p /workspace/scratch/yuanxiang_red_release_preview
python3 design/preview/parse_wxml.py > /workspace/scratch/yuanxiang_red_release_preview/wxml-ast.json
node design/preview/build.cjs
python3 design/preview/render.py
```

The Chromium export command may require the cloud execution permission override because the process sandbox cannot start the system browser. It uses `/usr/bin/chromium`, Playwright, and in-memory `set_content` to avoid policy-blocked local `file://` navigation. No network is used.

Artifacts under `/workspace/scratch/yuanxiang_red_release_preview`:

- `index.html`: self-contained scrollable overview containing14 pages/states in isolated iframes.
- `overview.png`: five root destinations, two-times pixel density.
- `home/tasks/gifts/trial/mine/sign/product/invite/offer/paid/unpaid/cool/sign-success/redeem-confirm.html` and `.png`: individual first-screen previews.
- `geometry.json`: recorded viewport/content widths and heights.
- `render-warnings.json`: unsupported/failed interpolation warnings; expected empty.

Scope: converts rpx at390/750, maps common WeChat layout tags/conditionals/loops/includes and actual icon/state components, embeds local PNG/JPG assets, approximates native title/capsule/safe areas. Native ads, announcement overlays, rich-text wxParse templates, runtime event handlers, video playback and API/state transitions are intentionally omitted. The browser layout review is not a WeChat compiler, device simulator, endpoint test or true-device screenshot. All images carry a browser-preview/demo-data watermark; figures and fixture names are not live business values.

Any layout conclusion must distinguish browser conversion issues from actual WXML/WXSS defects. All fourteen pages/states were checked at390px without horizontal overflow. Main content remains scrollable; initial screenshots intentionally show the first viewport, not an artificially compressed full page.

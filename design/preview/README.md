# Actual-code browser layout review

The preview converts the current registered WXML/WXSS and merges actual Page initial data with isolated demonstration fixtures. It does not use a hand-drawn HTML replacement. Brand assets are local; example article data lives in `fixtures.json`, and demonstration product photos live under `fixtures/`. Application pages never import these fixtures; `project.config.json` excludes the design tools from the runnable package.

The default `core` set preserves the 14 red/gold page and result previews. The `benefits` set adds reading/list/detail rewards, seven-day growth, first-level referral/friends and four help categories, and rechecks the home/tasks/account entrances.

Run from the repository root. First parse the current WXML into the chosen output directory:

```sh
mkdir -p /workspace/scratch/yuanxiang_red_benefits_preview
python3 design/preview/parse_wxml.py > /workspace/scratch/yuanxiang_red_benefits_preview/wxml-ast.json
node design/preview/build.cjs --set benefits --output /workspace/scratch/yuanxiang_red_benefits_preview
python3 design/preview/render.py --output /workspace/scratch/yuanxiang_red_benefits_preview
```

For the original set, use `--set core` and `/workspace/scratch/yuanxiang_red_release_preview`; both tools default to that original output path. An alternate writable output directory can be passed to both tools.

The renderer uses system Chromium, Playwright, and in-memory `set_content`; it does not use network requests or `file://` navigation. Browser startup may require the execution permission override in the managed cloud environment.

Artifacts:

- `manifest.json`: selected page/state names and expression warnings.
- `PAGE.html` and `PAGE.png`: independent scrollable HTML and first-viewport screenshots.
- `index.html`: small offline index linking its sibling HTML pages; keep them together when copying.
- `overview.png`: first five pages at twice pixel density; `--overview-limit` controls the number displayed.
- `geometry.json`: viewport/content/document widths and heights.
- `render-warnings.json`: unsupported or failed expressions, expected empty.

The converter maps rpx at 390/750, common WeChat tags/conditionals/loops/includes, and icon/state components. Horizontal native scroll views are represented as horizontally scrolling containers. Native advertisements, announcement overlays, wxParse rich-text templates, event handlers, video playback and backend transitions are omitted. Title/capsule/safe areas are approximations. All previews carry a browser/demo watermark.

Browser screenshots verify layout and readability only. They do not verify the WeChat compiler or renderer, a real device, backend, actual rewarded video, subscriptions or an order. Source defects and conversion limits must be distinguished when reviewing a screenshot.

The `brand` set covers current home/auth/settings/invitation branding and three reminder states. Use `--set brand --output /workspace/scratch/yuanxiang_brand_fix_preview` after writing its WXML AST as above.

The `referral` set covers seven actual referral reward layouts: invited user before first sign, the 5-coin welcome reward and 1/2-day progress, inviter totals and the published 10/5 rule, paid/pending records, a paused campaign retaining prior commitments, a failed refresh retaining the last confirmed response, and the sign success receipt showing the ordinary 10 coins separately from the 5-coin welcome reward and the 15-coin balance. It uses the production response normalizer and imported WXML templates, with isolated responses in `referral-fixtures.json`. It never runs a page lifecycle or settles a reward. The screenshots scroll to the reward section so these states can be reviewed directly.

```sh
mkdir -p /workspace/scratch/yuanxiang_real_referral_preview
python3 design/preview/parse_wxml.py > /workspace/scratch/yuanxiang_real_referral_preview/wxml-ast.json
node design/preview/build.cjs --set referral --output /workspace/scratch/yuanxiang_real_referral_preview
python3 design/preview/render.py --output /workspace/scratch/yuanxiang_real_referral_preview
```

Add `--width 320` to `build.cjs`, using a different output directory, to recheck a narrow viewport. The renderer reads that width from the generated manifest; both inline rpx and imported WXSS scale consistently. `geometry.json` records viewport widths and any overflowing reward cards, tabs or records.

`python3 design/preview/render_poster.py --output /workspace/scratch/yuanxiang_brand_fix_preview` executes the actual page-owned `red-poster.js` renderer through a browser CanvasContext adapter. It deliberately supplies a clearly marked demonstration code, not a usable invitation QR, and exercises package-root path normalization for both brand images. The output `poster-canvas.png` is a layout preview only; it does not execute the WeChat SDK, export APIs, or backend.

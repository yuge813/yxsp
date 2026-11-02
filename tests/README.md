# Offline validation

Run from the repository root with Node.js 18 or later:

```sh
npm run verify
```

No dependency install is needed. `npm test` runs the actual Page/module behavior tests through isolated `node:vm` contexts and offline `wx`/request stubs. `npm run check` checks source registration and references. `node scripts/validate.cjs` also runs both steps and preserves failure status.

Use `node tests/run.cjs` to run the complete behavioral suite. Individual suites can be run directly, for example `node tests/commerce.test.cjs`. The single-process loader avoids cloud test-child-context interference and reports the actual individual test count.

Covered behaviors include server-driven reward availability, home/read reward channels, complete-watch versus early-close settlement, account/wallet refresh, image fallbacks, async reading category races, pagination failures, signup/address validation, submission locks, explicit redemption confirmation, and ambiguous-order recovery. The rich-text adapter is exercised with real parsing as well as its injected event handlers.

The source checker checks all registered pages; JS/JSON syntax; static require/import/include/component/icon/asset/navigation references; WXML tag balance; and event handler names, including imported templates and the actual wxParse-injected handlers. It also reports a raw source-package estimate using `project.config.json` ignore rules.

These checks do **not** execute the WeChat compiler or renderer, a real device, business backend, native ad SDK, subscription delivery, or a real order. Dynamic references and server-schema correctness still require WeChat DevTools and device integration checks. Raw source bytes do not measure the compiled WeChat package size.

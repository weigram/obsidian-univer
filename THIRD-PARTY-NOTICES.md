# Third-Party Notices

Univer Sheet for Obsidian bundles the components listed below. This file records
their versions and licenses. The full text of the Apache License 2.0 is in
[LICENSE](./LICENSE); the attribution statement is in [NOTICE](./NOTICE).

## Summary

| Component | Version | License |
| --- | --- | --- |
| `@univerjs/core` | 1.2.0 | Apache-2.0 |
| `@univerjs/design` | 1.2.0 | Apache-2.0 |
| `@univerjs/engine-render` | 1.2.0 | Apache-2.0 |
| `@univerjs/sheets` | 1.2.0 | Apache-2.0 |
| `@univerjs/ui` | 1.2.0 | Apache-2.0 |
| `@univerjs/presets` | 1.2.0 | Apache-2.0 |
| `@univerjs/preset-sheets-core` | 1.2.0 | Apache-2.0 |
| `@univerjs/icons` | 1.46.0 | MIT |
| `react` | 18.3.1 | MIT |
| `react-dom` | 18.3.1 | MIT |
| `rxjs` | 7.8.2 | Apache-2.0 |
| `sonner` | 2.0.8 | MIT |
| `clsx` | 2.1.1 | MIT |
| `@univerjs-pro/bases` | 1.2.0 | Univer Pro commercial license — see below |
| `@univerjs-pro/bases-ui` | 1.2.0 | Univer Pro commercial license — see below |
| `@univerjs-pro/engine-formula` | 1.2.0 | Univer Pro commercial license — see below |
| `@univerjs-pro/license` | 1.2.0 | Univer Pro commercial license — see below |

MIT and Apache-2.0 components are used under the terms of their respective
licenses. Their copyright notices are retained in the bundled output where the
license requires it.

## Univer Pro components

The `@univerjs-pro/*` packages listed above are part of **Univer Pro** and are
published by DreamNum under a **separate commercial license**. They are **not**
open source and are **not** covered by the Apache License 2.0 that applies to the
`@univerjs/` packages.

Points to be aware of:

1. The published npm packages do **not** ship a `LICENSE` file. The applicable
   terms have to be obtained directly from DreamNum / Univer.
2. These packages are bundled into `main.js` at build time. Redistributing a build
   that contains them requires a right to redistribute the Pro components, which
   is granted by the Univer Pro terms, not by Apache-2.0.
3. A license key is required for the Pro features to run without limitations.
   Without a key the plugin falls back to Univer's evaluation mode, which may
   enforce limits or display a watermark.
4. If you build, fork or redistribute this plugin, you are responsible for making
   sure your use of the Pro packages complies with the terms you accepted.

Univer / Univer Pro resources:

- Website: https://univer.ai
- Documentation: https://docs.univer.ai
- Source of the upstream plugin: https://github.com/dream-num/obsidian-univer

## Build note

`main.js` is a minified bundle produced by Vite / Rollup. Minification is used to
reduce download size only; the corresponding source code is available in this
repository, and no code is obfuscated to hide its purpose.

## 中文说明

- `@univerjs/*` 为 Apache-2.0 开源组件，可自由分发，但需保留 `LICENSE` 与 `NOTICE` 中的版权声明。
- `@univerjs-pro/*` 属于 Univer Pro，采用 DreamNum 的商业许可，**不属于** Apache-2.0。npm 包内没有附带许可证文本，具体条款需向 Univer 获取。
- 未配置 license key 时，Pro 功能以评估模式运行，可能有功能限制或水印。
- 若你要再分发本插件的构建产物，请自行确认已获得 Pro 组件的再分发授权。

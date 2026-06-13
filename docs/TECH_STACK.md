# 技術スタック

**ステータス: 導入済み**(2026-06-13、feat-001 完了)。下記スタックを `app/` に組み込み、シミュレータでの動作(Hello World 表示)を確認済み。具体バージョンは `app/package.json` および `app/package-lock.json` を正とする(本ファイルと差異が出た場合は package.json が優先)。

## 決定事項

| 項目 | 内容 | 選定理由 |
|------|------|----------|
| 言語 | TypeScript `~6.0.3`(導入済み) | Even Hub アプリの公式開発言語が Web 技術(HTML/CSS/JS/TS)であるため |
| ランタイム | Node.js v24.11.1 | 開発PCに既存。SDK の要件 `^20.0.0 \|\| >=22.0.0` への適合を確認済み |
| パッケージ管理 | npm 11.6.2 | Node.js 付属。公式SDK・シミュレータが npm で配布されている |
| SDK | `@evenrealities/even_hub_sdk` 0.0.10(導入済み・完全固定) | Even Realities 公式SDK。ESM/CJS 両対応・TypeScript 型定義同梱 |
| シミュレータ | `@evenrealities/evenhub-simulator` 0.7.3(導入済み・完全固定、devDependencies) | 公式シミュレータ。実機到着(2026年8月頃見込み)までの動作確認環境。Linux x64 バイナリがこのPCで GUI 起動・automation API とも動作することを実証済み |
| ビルドツール | Vite `^8.0.16`(導入済み) | 公式ドキュメント(getting-started)が Vite + SDK 構成を例示しているため |
| UIフレームワーク | 使用しない(vanilla TypeScript) | feat-001 は Hello World 表示のみで不要(requirements.md 制約・design.md ADR) |

## 導入しないもの(現時点)

| 項目 | 理由 |
|------|------|
| `@evenrealities/evenhub-cli` 0.1.13 | 用途は実機サイドロード用 QR 生成・app.json 生成・ストア提出用パッケージング(.ehpk)。シミュレータゴールの feat-001 では不要。実機到着後の案件で導入を検討する |

## 今後の案件で導入を検討するもの

- `@evenrealities/evenhub-cli`(実機サイドロード・ストア提出。実機到着後)
- `@evenrealities/pretext`(G2向けフォント測定。表示の作り込み時)

## 参考リンク

- Even Hub 開発者ポータル: https://hub.evenrealities.com/
- 公式ドキュメント: https://hub.evenrealities.com/docs (getting-started/installation, first-app, reference/simulator, reference/cli, reference/packaging)
- コミュニティツールキット(参考): https://github.com/fabioglimb/even-toolkit
- feat-001 技術調査結果: [issues/feat-001-hello-world/research.md](issues/feat-001-hello-world/research.md)(SDK の API 制約・シミュレータの automation API 等の詳細)

## 記述ルール

- ライブラリの追加・変更・削除を行った場合は本ファイルを更新する
- 新規ライブラリ導入時は「用途・選定理由・バージョン」を必ず記載する

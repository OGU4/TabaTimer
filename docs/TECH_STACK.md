# 技術スタック

**ステータス: 方向決定**(2026-06-11)。2026-06-12 の feat-001 技術調査で、下記バージョンの動作をこのPC上で実証済み(詳細: [issues/feat-001-hello-world/research.md](issues/feat-001-hello-world/research.md))。正式導入(本体プロジェクトへの組み込み)は feat-001 の実装時に行い、その時点で本ファイルを「導入済み」に更新する。

## 決定事項

| 項目 | 内容 | 選定理由 |
|------|------|----------|
| 言語 | TypeScript | Even Hub アプリの公式開発言語が Web 技術(HTML/CSS/JS/TS)であるため |
| ランタイム | Node.js v24.11.1(インストール済み) | 開発PCに既存。SDK の要件 `^20.0.0 \|\| >=22.0.0` への適合を確認済み |
| パッケージ管理 | npm 11.6.2(インストール済み) | Node.js 付属。公式SDK・シミュレータが npm で配布されている |
| SDK | `@evenrealities/even_hub_sdk` 0.0.10(検証済み) | Even Realities 公式SDK。ESM/CJS 両対応・TypeScript 型定義同梱 |
| シミュレータ | `@evenrealities/evenhub-simulator` 0.7.3(検証済み) | 公式シミュレータ。実機到着(2026年8月頃見込み)までの動作確認環境。Linux x64 バイナリがこのPCで GUI 起動・automation API とも動作することを実証済み |
| ビルドツール | Vite(方向決定) | 公式ドキュメント(getting-started)が Vite + SDK 構成を例示しているため。具体バージョンは feat-001 実装時に確定 |

## 導入しないもの(現時点)

| 項目 | 理由 |
|------|------|
| `@evenrealities/evenhub-cli` 0.1.13 | 用途は実機サイドロード用 QR 生成・app.json 生成・ストア提出用パッケージング(.ehpk)。シミュレータゴールの feat-001 では不要。実機到着後の案件で導入を検討する |

## feat-001 の設計時に確定すること

- UI フレームワークの要否(React 等を使うか vanilla TypeScript か。公式は自由選択と明記)
- TypeScript・Vite の具体バージョン

## 参考リンク

- Even Hub 開発者ポータル: https://hub.evenrealities.com/
- 公式ドキュメント: https://hub.evenrealities.com/docs (getting-started/installation, first-app, reference/simulator, reference/cli, reference/packaging)
- コミュニティツールキット(参考): https://github.com/fabioglimb/even-toolkit
- feat-001 技術調査結果: [issues/feat-001-hello-world/research.md](issues/feat-001-hello-world/research.md)(SDK の API 制約・シミュレータの automation API 等の詳細)

## 記述ルール

- ライブラリの追加・変更・削除を行った場合は本ファイルを更新する
- 新規ライブラリ導入時は「用途・選定理由・バージョン」を必ず記載する

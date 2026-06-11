# 技術スタック

**ステータス: 方向決定**(2026-06-11)。バージョン等の詳細は最初の機能案件(feat-001)の環境構築時に確定し、本ファイルを更新する。

## 決定事項

| 項目 | 内容 | 選定理由 |
|------|------|----------|
| 言語 | TypeScript | Even Hub アプリの公式開発言語が Web 技術(HTML/CSS/JS/TS)であるため |
| ランタイム | Node.js v24.11.1(インストール済み) | 開発PCに既存 |
| パッケージ管理 | npm 11.6.2(インストール済み) | Node.js 付属。公式SDK・シミュレータが npm で配布されている |
| SDK | `@evenrealities/even_hub_sdk` | Even Realities 公式SDK |
| シミュレータ | `evenhub-simulator` | 公式シミュレータ。実機到着(2026年8月頃見込み)までの動作確認環境 |

## feat-001 の設計時に確定すること

- TypeScript・SDK・シミュレータの具体バージョン
- ビルドツール(公式ドキュメントは Vite を例示)
- UIフレームワーク(React / vanilla 等。公式は自由選択と明記)
- CLI ツール(`evenhub` コマンド)の導入方法

## 参考リンク

- Even Hub 開発者ポータル: https://hub.evenrealities.com/
- 公式ドキュメント: https://hub.evenrealities.com/docs (getting-started/installation, first-app, reference/simulator, reference/cli, reference/packaging)
- コミュニティツールキット(参考): https://github.com/fabioglimb/even-toolkit

## 記述ルール

- ライブラリの追加・変更・削除を行った場合は本ファイルを更新する
- 新規ライブラリ導入時は「用途・選定理由・バージョン」を必ず記載する

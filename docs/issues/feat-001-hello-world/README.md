# feat-001: シミュレーターで Hello World

## ステータス

In Progress(2026-06-12 開始)

## 概要

Even Hub アプリの開発環境をこのPC(Ubuntu 24.04)に構築し、公式シミュレータ(evenhub-simulator)のグラス表示領域に「Hello World」を表示する。TabaTimer 開発の土台となる最初の案件であり、SDK・シミュレータ・CLI の実態を把握することも目的とする。

## ゴール(受け入れ条件)

- シミュレータのグラス表示領域に「Hello World」というテキストが表示されること
- 起動手順がドキュメント化されており、ユーザーが自分で再現できること

## ロードマップ

CLAUDE.md の機能追加フローに沿って進める。

| # | ステップ | 内容 | 成果物 |
|---|----------|------|--------|
| 1 | 案件作成 | 案件フォルダ作成、BACKLOG 登録 | 本ファイル(完了) |
| 2 | 技術調査 | SDK / CLI / シミュレータの仕様確認(公式ドキュメント・npmパッケージの実物)。アプリの最小構成と表示APIの特定 | 調査結果(requirements.md / design.md の材料) |
| 3 | 要求仕様書作成 | Hello World の機能要求・受け入れ基準を `REQUIREMENTS_STANDARD.md` 準拠で記述 | requirements.md |
| 4 | 機能設計書作成 | プロジェクト構成、使用パッケージとバージョン、表示処理、起動手順を `DESIGN_STANDARD.md` 準拠で記述 | design.md |
| 5 | レビュー | Codex + 人レビュー。重要度「高」「中」の指摘がゼロになるまで修正 | レビュー済みドキュメント |
| 6 | 実装 | CLI / SDK 導入 → プロジェクト作成 → Hello World 実装 → シミュレータ起動 | 動作するアプリ |
| 7 | 手動テスト | ユーザーがシミュレータで「Hello World」表示を確認 | 合否判定 |
| 8 | 完了処理 | BACKLOG / CLAUDE.md(ディレクトリ構成)/ TECH_STACK.md(確定バージョン)を更新 | ステータス Closed |

## 調査済みの技術情報(2026-06-12 時点)

npm レジストリで確認済みの公式パッケージ:

| パッケージ | 最新版 | 用途 |
|------------|--------|------|
| `@evenrealities/even_hub_sdk` | 0.0.10 | TypeScript SDK。Even App との通信を担う |
| `@evenrealities/evenhub-cli` | 0.1.13 | CLI(短縮形 `eh`)。`evenhub init`(app.json 生成)/ `evenhub qr`(実機サイドロード用QR)/ `evenhub pack`(.ehpk パッケージ化) |
| `@evenrealities/evenhub-simulator` | 0.7.3 | 公式シミュレータ。`@evenrealities/sim-linux-x64` が存在し、このPC(Linux x64)で動作可能 |
| `@evenrealities/pretext` | 0.1.4 | G2 向けピクセル精度フォント測定ライブラリ(本案件では未使用見込み。表示作り込み時の候補) |

アプリの実行モデル(公式ドキュメント getting-started/overview より):
- アプリロジックはスマホの Even App 内で実行され、グラスは表示レンダリングとスクロール処理を担当する
- 開発は Web 技術(HTML/CSS/JS/TS)。Vite + SDK の構成が公式ドキュメントの例
- 開発フロー: コード作成 → evenhub-simulator でローカル確認 → QR で実機サイドロード → `evenhub pack` → Even Hub 提出(公開時)

## 未確定事項(ステップ2で調査すること)

- シミュレータの起動方法・操作方法(`evenhub-simulator` パッケージの実物を導入して確認)
- プロジェクトの推奨構成(公式テンプレート・スキャフォールドの有無。`evenhub init` が生成するのは app.json のみか)
- SDK の表示 API(テキストをグラス画面に出す具体的な方法)
- 表示解像度の正確な仕様(コミュニティ情報ではグラス側 576x288px、イメージ上限 288x144 — 公式情報での裏取りが必要)
- 公式ドキュメントの installation / first-app / simulator ページの内容(JSレンダリングのため WebFetch では取得不可。SDK パッケージ内の README やシミュレータ導入後の実物で確認する)

# feat-002: デジタル時計風表示

## 概要

Even Hub アプリ `app/` のグラス画面に現在時刻を `HH:MM:SS`(24時間制)で表示し、毎秒自動更新し続けるデジタル時計を実装する。当面のゴール「シミュレータ上のインターバルタイマー完成」の中核技術である「同位置の継続更新(同じ位置で数値を毎秒切り替える仕組み)」を最小機能で確立・実証することが目的。

## ステータス

In Progress(調査・ドキュメント作成 → レビュー待ち)

## 種別

feat

## ドキュメント

- [research.md](research.md): 技術調査(公式テンプレート実コード・更新パターン・イベント処理)
- [requirements.md](requirements.md): 要求仕様書(FR-001 初期表示 / FR-002 毎秒更新 / FR-003 ダブルタップ終了)
- [design.md](design.md): 機能設計書

## 動作確認方法(予定)

1. `app/` で dev server 起動 + シミュレータを automation-port 付きで起動。
2. `/api/screenshot/glasses` を間隔をあけ複数回取得し、`HH:MM:SS` が秒進行に追従して更新されることを確認。
3. `POST /api/input {"action":"double_click"}` で終了動作を確認。
</content>

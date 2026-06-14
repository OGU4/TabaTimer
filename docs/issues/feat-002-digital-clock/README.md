# feat-002: デジタル時計風表示

## 概要

Even Hub アプリ `app/` のグラス画面に現在時刻を `HH:MM:SS`(24時間制)で表示し、毎秒自動更新し続けるデジタル時計を実装する。当面のゴール「シミュレータ上のインターバルタイマー完成」の中核技術である「同位置の継続更新(同じ位置で数値を毎秒切り替える仕組み)」を最小機能で確立・実証することが目的。

## ステータス

Closed(2026-06-14 完了。実装・automation 自動検証・手動テスト合格)

## 種別

feat

## ドキュメント

- [research.md](research.md): 技術調査(公式テンプレート実コード・更新パターン・イベント処理)
- [requirements.md](requirements.md): 要求仕様書(FR-001 初期表示 / FR-002 毎秒更新 / FR-003 ダブルタップ終了)
- [design.md](design.md): 機能設計書

## 動作確認方法(実績)

1. `app/` で dev server 起動 + シミュレータを automation-port 付き(`npm run sim:auto`)で起動。
2. `/api/screenshot/glasses` を 3 秒間隔で取得し、`14:44:13`→`14:44:16` と秒進行に追従して更新されることを確認。
3. `/api/console` で `[clock] displayed: <初期時刻>` と毎秒更新を確認、エラーログなし。
4. `POST /api/input {"action":"double_click"}` で `[clock] cleanup done` 出力と更新ループ停止(終了動作)を確認。
5. 手動テスト合格(`npm run dev` + `npm run sim`)。
</content>

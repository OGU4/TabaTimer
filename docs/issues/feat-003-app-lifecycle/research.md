# feat-003 調査記録(research)

調査時点: 2026-06-14 / 一次情報: `@evenrealities/even_hub_sdk` 0.0.10 の `README.md` および `dist/index.d.ts`

本ファイルは調査時点のスナップショット。再利用価値のある知見は完了処理時に `docs/tech_notes.md` へ抽出する。

## 1. 起動処理(公式推奨)

公式 README「Basic Usage」「Creating Glasses UI」より、推奨される起動シーケンス:

1. `waitForEvenAppBridge()` でブリッジを取得する。SDK は自動初期化するが、準備完了の保証のため `waitForEvenAppBridge()` の使用を推奨(README 末尾 Best Practices 1)。普通のブラウザでは解決しない。
2. **起動元の判別**: `bridge.onLaunchSource((source) => ...)` がロード完了時に**1回だけ** push される。
   - 値(`LaunchSource` 型): `'appMenu'`(スマホ Even App のメニューから起動)/ `'glassesMenu'`(グラスのメニューから起動)。
   - 低レベルでは `window._listenEvenAppMessage({ method: 'evenAppLaunchSource', data: { launchSource } })` で届き、`evenAppLaunchSource` DOM イベント(`e.detail.launchSource`)でも受けられる。
   - `onEvenHubEvent` とは**別系統**で、launch source は `onEvenHubEvent` には含まれない(README 明記)。
   - push が**1回限り**のため、リスナーは**できるだけ早く**登録する(README「Register the listener as early as possible because this push happens only once after loading completes」)。
   - SDK 0.0.10 dist に実在を確認: `index.d.ts:1220 onLaunchSource(callback: (source: LaunchSource) => void): () => void`。戻り値は購読解除関数。
3. **UI 生成**: `createStartUpPageContainer()` を**最初に必ず1回だけ**呼ぶ(他の UI 操作より前)。2回目以降は無効。以降の更新は `rebuildPageContainer()` / `textContainerUpgrade()`(tech_notes 3章既知)。
   - 戻り値 `StartUpPageCreateResult`: `0`=Success / `1`=Invalid / `2`=Oversize / `3`=OutOfMemory。

### onLaunchSource の TabaTimer での扱い(本案件の判断)

- TabaTimer は appMenu / glassesMenu のどちらから起動されても**同じ初期画面を表示**する(起動元で分岐しない)。
- ただし将来の分岐や実機デバッグのため、**起動元をログ出力**し、リスナーをブリッジ取得直後(`createStartUpPageContainer` より前)に登録する。
- push が来ない環境(シミュレータが launch source を送らない場合)でも起動処理は阻害されない設計とする。`onLaunchSource` は通知の購読のみで、起動シーケンスのブロッキング条件にしない。

## 2. 終了処理(公式)

1. `shutDownPageContainer(exitMode?: number): Promise<boolean>`(README L663-683)。
   - `exitMode = 0`(デフォルト): 即終了。
   - `exitMode = 1`: 前面インタラクション層を表示しユーザーに終了可否を委ねる。
   - 公式テンプレートの慣習はダブルタップ(`DOUBLE_CLICK_EVENT`)→ `shutDownPageContainer`(tech_notes 5章既知)。
2. ライフサイクルイベント(`onEvenHubEvent` の `sysEvent.eventType`):
   - `SYSTEM_EXIT_EVENT`(7)/ `ABNORMAL_EXIT_EVENT`(6): 後始末(ループ停止・`unsubscribe()`)。
   - `FOREGROUND_ENTER_EVENT`(4)/ `FOREGROUND_EXIT_EVENT`(5): 前面/背面遷移。
   - `Sys_ItemEvent.systemExitReasonCode?: number` が取れるが「通常は処理不要」(README L1196)。
3. `window.addEventListener('beforeunload', cleanup)` を WebView 破棄時の後始末保証に併用(tech_notes 5章既知)。

## 3. 現状コード(feat-002 `app/src/main.ts`)との差分

| 項目 | 現状 | feat-003 |
|------|------|----------|
| ブリッジ取得 + タイムアウト | 実装済み | 維持 |
| `createStartUpPageContainer`(1回) | 実装済み | 維持 |
| ダブルタップ → `shutDownPageContainer(1)` | 実装済み | 維持(仕様明文化) |
| `SYSTEM_EXIT`/`ABNORMAL_EXIT` → cleanup | 実装済み | 維持(仕様明文化) |
| `beforeunload` → cleanup | 実装済み | 維持(仕様明文化) |
| `onLaunchSource` 起動元判別 | **未実装** | **新規追加(ログ出力 + 早期登録 + cleanup で解除)** |
| `FOREGROUND_ENTER/EXIT` | 未処理 | 更新は継続(挙動変更なし)。ログのみ任意 |

## 4. シミュレータでの検証可否

- `onLaunchSource`: シミュレータが `evenAppLaunchSource` を push するか未確認。**push されればコンソールに起動元ログが出る/されなければ出ないだけ**で、起動処理自体は成立する。automation API の `/api/console` でログ有無を確認する。
- ライフサイクル終了イベント(`SYSTEM_EXIT`/`ABNORMAL_EXIT`): シミュレータでは非発火(tech_notes 7章)。コードは実装済みだが実機初検証。
- ダブルタップ終了: `POST /api/input {"action":"double_click"}` で検証可能(feat-002 実証済み)。

出典: SDK 0.0.10 README(L84-118, L663-683, L1155-1198)/ dist/index.d.ts(L1220)/ feat-002 research.md・tech_notes.md

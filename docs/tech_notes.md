# TECH NOTES(技術知見ノート)

最終ゴール「Even Realities G2 上で動作するインターバルタイマーアプリ」を実現するための、案件横断の技術的知見を集約・共有するためのノート。各案件の `research.md`(調査時点のスナップショット)から、再利用価値の高い知見をここに抽出して蓄積する。

- **対象読者**: このプロジェクトを実装する開発者(/clear 後の自分自身を含む)
- **更新方針**: 案件(feat 系 / bug 系)の**完了処理時**(機能追加フロー・不具合修正フローのステップ8)に、その案件で得た再利用価値の高い知見を `research.md`・`investigation.md`・実装から抽出して追記する。出典(案件・公式資料)を明記する。再利用価値のある知見がなければ追記不要
- **位置づけ**: 各案件の `docs/issues/{案件}/research.md` が一次調査記録、本ファイルが横断サマリ

最終更新: 2026-06-14(feat-002 完了時点)

---

## 1. アーキテクチャの全体像

Even Hub アプリの実体は **WebView 内で動く Web ページ**。

```
[Web アプリ(Vite dev server + TypeScript + even_hub_sdk)]
        ↑ HTTP で読み込み
[ホスト(本番=スマホの Even App / 開発=evenhub-simulator)]
        ↑ BLE(本番のみ。グラスへ表示転送)
[Even G2(576×288 のグラス画面に緑色モノクロ描画)]
```

- アプリロジックはホスト(スマホ Even App / シミュレータ)内の WebView で動く。グラスは表示レンダリングとスクロール処理を担当
- Web ページは SDK の `EvenAppBridge` 経由でホストと双方向通信する
- **普通のブラウザで開くとブリッジが存在せず `waitForEvenAppBridge()` が解決しない**。動作確認は必ずシミュレータ(または実機)で行う

出典: feat-001 research.md

---

## 2. グラス画面・UI モデル

- キャンバスは **576×288**、原点は左上、X は右+ / Y は下+
- UI は「コンテナ」の集合。種類は **list / text / image** の3種、合計 **1〜12 個**(text 最大8、image 最大4)
- **ちょうど1つ**のコンテナに `isEventCapture: 1` を設定する(他は 0)。タップ/ダブルタップ等のイベント受信に必須
- 4bit 色でレンダリング(シミュレータ v0.5.2 以降)。実機は緑色モノクロ

### 主なコンテナ制約

| 項目 | 制約 |
|------|------|
| `containerName` | 最大16文字 |
| `content`(起動時 `TextContainerProperty`) | 最大1000文字(転送効率のため起動時は短く推奨) |
| `content`(`textContainerUpgrade`) | SDK 仕様 max2000、ただし**シミュレータ 0.7.1+ は 999 バイト上限** |
| 座標・サイズ | 0〜576 / 0〜288 |
| 画像 | 起動時に送れない。作成後 `updateImageRawData()`、最大 288×144 |

出典: feat-001 / feat-002 research.md

---

## 3. 画面更新の3手段と使い分け(重要)

| API | 用途 | 呼べる回数 |
|-----|------|-----------|
| `createStartUpPageContainer()` | 起動時の初期ページ作成 | **アプリ起動後1回だけ**(2回目以降は無効) |
| `rebuildPageContainer()` | ページ全体の再構築 | 初回ページ以降、随時 |
| `textContainerUpgrade()` | テキストコンテナの content 部分更新 | 随時 |

- `createStartUpPageContainer()` の戻り値: `0`=Success / `1`=Invalid / `2`=Oversize / `3`=OutOfMemory
- **「同じ位置で数値を毎秒切り替える」表示(時計・カウントダウン)は `textContainerUpgrade()` を使う。** コンテナ構造は変えず content だけ差し替えるため最軽量
- 再表示時はシミュレータの再起動が確実(`createStartUpPageContainer` が起動後1回しか呼べないため、ページリロードでは初期化できない)

出典: feat-001 / feat-002 research.md・SDK 0.0.10 README

---

## 4. 「同位置の継続更新」パターン(インターバルタイマーの中核技術)

時計・カウントダウンなど、**同じ位置の数字を一定間隔で書き換え続ける**実装の確立パターン。feat-002 でシミュレータ実証済み。

```typescript
// 1) 起動時: 表示コンテナを1つ作る(isEventCapture: 1)
await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
  containerTotalNum: 1,
  textObject: [new TextContainerProperty({
    xPosition, yPosition, width, height,
    containerID: 1, containerName: 'clock',
    content: initialText, isEventCapture: 1,
  })],
})); // 0 が返れば成功

// 2) 更新: content だけ差し替え。書き込みは Promise チェーンで直列化する
let rendering: Promise<unknown> = Promise.resolve();
function render(content: string): void {
  rendering = rendering
    .then(() => bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: 1, containerName: 'clock', content,
    })))
    .catch((err) => console.error('upgrade failed:', err)); // 単発失敗はログのみ、ループ継続
}

// 3) ループ: setInterval。毎回 new Date() を読み直し累積ドリフトを表示に持ち込まない
const id = setInterval(() => render(formatNow()), 1000);
```

### 設計上の要点(feat-002 で確定)

- **直列化が重要**: ブリッジ書き込みを Promise チェーンで直列化し、更新の重なり・順序逆転を防ぐ(公式 text-heavy テンプレート由来)。毎秒1回でも、シミュレータ/実機の応答遅延に対する保険
- **毎回時刻を読み直す**: `setInterval` は厳密に一定間隔でなく遅延が累積し得る。表示値はカウンタ加算でなく「その瞬間の実時刻」を都度生成すると自己修正される(スリープ復帰でもずれない)
- **初期表示と更新の二重描画を避ける**: 起動時に初期値を表示済みなら、`setInterval` 起動直後の即時 `render()` 呼び出しは不要(次の1拍後の発火で十分)
- **単発失敗で止めない**: `textContainerUpgrade` の失敗は `catch` でログのみ。`rendering` チェーンは解決済みになるため次回更新で復帰する

出典: feat-002 design.md / 実装(`app/src/main.ts`)

---

## 5. 入力・イベント処理・終了

- 購読は `bridge.onEvenHubEvent(handler)`。返り値 `unsubscribe()` で解除
- **イベント経路は2系統**: タップ/ダブルタップ/ライフサイクルは `event.sysEvent`、スクロール(SCROLL_TOP/BOTTOM)は `event.textEvent`。両ブランチを別々に判定する
- **Protobuf はゼロ値フィールドを省略する**。`CLICK_EVENT`(値0)はワイヤ上 `undefined` で届くため、比較前に `?? null`(または `?? 0`)で coalesce する(誤判定防止)
- **ダブルタップ → `shutDownPageContainer(exitMode)` でアプリ終了**が公式テンプレートの慣習。`exitMode` は 0=即終了 / 1=前面レイヤをポップしユーザー操作待ち(テンプレートは 1)
- ライフサイクル `SYSTEM_EXIT_EVENT`(7)/ `ABNORMAL_EXIT_EVENT`(6)を受けたら後始末(ループ停止・`unsubscribe()`)。`window.addEventListener('beforeunload', cleanup)` も併用

### `OsEventTypeList`(SDK 0.0.10 実値)

| 値 | 名前 | 値 | 名前 |
|----|------|----|------|
| 0 | CLICK_EVENT | 5 | FOREGROUND_EXIT_EVENT |
| 1 | SCROLL_TOP_EVENT | 6 | ABNORMAL_EXIT_EVENT |
| 2 | SCROLL_BOTTOM_EVENT | 7 | SYSTEM_EXIT_EVENT |
| 3 | DOUBLE_CLICK_EVENT | 8 | IMU_DATA_REPORT |
| 4 | FOREGROUND_ENTER_EVENT | | |

出典: feat-002 research.md / SDK 実値確認(`node -e` で `OsEventTypeList` を dump)

---

## 6. 開発・自動検証環境(シミュレータ automation API)

`evenhub-simulator <URL> --automation-port <PORT>` で HTTP API が有効になり、Claude Code が自律的に「表示 → スクショ取得 → 内容確認」を行える。

| メソッド | エンドポイント | 内容 |
|----------|---------------|------|
| GET | `/api/ping` | ヘルスチェック(200/`pong`) |
| GET | `/api/screenshot/glasses` | グラス画面の 576×288 PNG(コンテナ未作成時は透明) |
| GET | `/api/screenshot/webview` | WebView のスクリーンショット |
| GET | `/api/console` | WebView の console 出力(`?since_id=N` で増分取得) |
| DELETE | `/api/console` | コンソールバッファのクリア |
| POST | `/api/input` | タッチ操作送信。body `{"action":"up"\|"down"\|"click"\|"double_click"}`(イベントコンテナがある間のみ有効) |

### 検証の定石(feat-002 で確立)

1. ターミナル1で `npm run dev`(先に起動、5173 待ち受け確認)
2. ターミナル2で `npm run sim:auto`(automation port 9898 付き)
3. `/api/screenshot/glasses` を**間隔をあけ複数回**取得 → 数値が秒進行に追従して更新されることを目視確認
4. `/api/console` で初期表示ログ・エラー有無を確認(毎秒の成功ログは出さない設計にしてバッファ溢れを防ぐ)
5. `POST /api/input {"action":"double_click"}` で終了動作(cleanup・ループ停止)を確認

### 起動・運用の注意

- `targetUrl` は**必須**(ヘルプ表記はオプショナルだが省略するとエラー終了)
- GUI 起動には X11 が必要(このPCは `DISPLAY=:1`)。dev server を**必ず先に**起動する
- ポート: dev server `127.0.0.1:5173`(strictPort)、automation `9898`

出典: feat-001 / feat-002 research.md・実運用

---

## 7. 実機 Even G2 固有の未確認ギャップ(実機到着=2026年8月見込みで検証する項目)

シミュレータは**実機と差異がある**(公式明記: フォントレンダリング・色・リスト挙動・エラーハンドリング・画像サイズ制限の未強制。ステータスイベント非発火、`imuData` 常に null、`eventSource` は右グラス固定、前面固定)。以下は実機到着まで検証不能なため、将来フェーズの検証項目として残す。

1. **毎秒更新の見た目品質** — 導光板 + 4bit 色 + 実フォントでのちらつき・残像・桁送りの滑らかさ
2. **更新レイテンシ・BLE 追従** — スマホ Even App → BLE → グラス経由で、毎秒の `textContainerUpgrade` が帯域で詰まらないか・表示遅延が出ないか
3. **バックグラウンド keep-alive** — SDK 0.0.10「Enhanced WebView background keep-alive」。運動中に画面/`setInterval` が落ちないか(シミュレータは前面固定で検証不可)
4. **ライフサイクル/終了イベントの実発火** — `SYSTEM_EXIT`/`ABNORMAL_EXIT` はシミュレータで非発火。コードは実装済みだが実機で初検証
5. **運動中の視認性(UX)** — フォントサイズ・コントラストが運動中の HUD で読めるか

出典: feat-001 / feat-002 research.md・SDK 0.0.10 Changelog

---

## 8. パッケージ・実機配布(参考)

| パッケージ | バージョン | 用途 |
|------------|-----------|------|
| `@evenrealities/even_hub_sdk` | 0.0.10 | 公式 SDK(ブリッジ・コンテナ API・型定義) |
| `@evenrealities/evenhub-simulator` | 0.7.3 | シミュレータ(devDependencies) |
| `@evenrealities/evenhub-cli` | 0.1.13 | `qr`(実機サイドロード)/ `init`(app.json)/ `pack`(.ehpk)/ `login`。**シミュレータ段階では不要** |

- 公式テンプレート `even-realities/evenhub-templates`(minimal / asr / image / text-heavy)が実装パターンの正本。**text-heavy が `textContainerUpgrade` 直列化の参照元**
- 実機配布フロー: `evenhub pack` で `.ehpk` 化 → QR/ポータルでサイドロード or Even Hub に提出。シミュレータゴールではスコープ外

出典: feat-001 / feat-002 research.md

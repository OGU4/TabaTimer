# feat-002 技術調査結果(デジタル時計風表示)

調査日: 2026-06-14
調査方法: 公式 SDK 一次資料(`app/node_modules/@evenrealities/even_hub_sdk` の型定義・README)、シミュレータ README(0.7.3)、公式テンプレートリポジトリ `even-realities/evenhub-templates`(実コードを `tmp/evenhub-templates/` に取得して精読)。feat-001 の調査結果(`docs/issues/feat-001-hello-world/research.md`)も再利用する。

## 結論サマリ

「同じ位置に時刻様の数字を出し、毎秒更新し続ける」デジタル時計は、以下の構成で実現できる見込み。技術スタックは feat-001 で確立済みの `app/` をそのまま使う。

```
起動時: createStartUpPageContainer() で時刻表示テキストコンテナを1つ作成
更新:   setInterval(1000ms) ごとに textContainerUpgrade() で content を現在時刻(HH:MM:SS)に差し替え
終了:   ダブルタップ → shutDownPageContainer(1)
検証:   automation API の /api/screenshot/glasses を複数回取得し、秒が進むことを確認
```

毎秒更新が滑らかか/ちらつかないかは**シミュレータでの実証が必要**(SDK・シミュレータの資料に毎秒更新の保証・実例はない)。本案件はその実証も兼ねる。

## feat-001 以降の新発見

### 1. 公式テンプレートが実在する(feat-001 research.md の更新)

feat-001 時点では「公式のプロジェクトスキャフォールドは存在しない」と記録したが、公式リポジトリ `even-realities/evenhub-templates` に4種のテンプレート(minimal / asr / image / text-heavy)が存在することを確認した。いずれも Vite + TypeScript + Even Hub SDK + simulator 構成。`app/` は既に feat-001 で同等構成を構築済みのため**乗り換えは不要**だが、テンプレートの実コードは実装パターンの正本として参照価値が高い。

### 2. テキスト更新の正式パターン(text-heavy テンプレートより)

公式 text-heavy テンプレート(`tmp/evenhub-templates/text-heavy/src/main.ts`)が `textContainerUpgrade()` の実コードを示している。デジタル時計の毎秒更新に直接転用できる:

```typescript
// 意図の伝達用。textContainerUpgrade を直列化してオーバーラップを防ぐ
let rendering: Promise<unknown> = Promise.resolve();
function update(content: string) {
  rendering = rendering.then(() =>
    bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 1, containerName: 'clock', content }),
    ),
  );
}
```

- **直列化が重要**: ブリッジへの書き込みを Promise チェーンで直列化し、更新が重ならないようにしている。毎秒更新でも前回更新の完了を待ってから次を投げる方針に転用する。
- `TextContainerUpgrade` は SDK のクラス。フィールドは `containerID` / `containerName`(max16) / `content`(SDK 仕様 max2000、ただしシミュレータ 0.7.1 以降は **999 バイト上限**)/ `contentOffset` / `contentLength`。時刻文字列(最大 `HH:MM:SS` = 8 バイト)は余裕で収まる。

### 3. イベント処理の作法(両テンプレート共通)

- **Protobuf がゼロ値フィールドを省略する**ため、`CLICK_EVENT`(値0)はワイヤ上で `undefined` として届く。比較前に必ず `?? 0`(またはここでは `?? null`)で coalesce する。
- イベント経路は2系統に分かれる: タップ/ダブルタップ/ライフサイクルは `event.sysEvent`、スクロール(SCROLL_TOP/BOTTOM)は `event.textEvent`。各ブランチを別々に判定する。
- **ダブルタップ → `shutDownPageContainer(1)` でアプリ終了**が公式テンプレートの慣習。どちらの envelope で届いても終了できるよう root レベルで判定する。
- ライフサイクル: `SYSTEM_EXIT_EVENT` / `ABNORMAL_EXIT_EVENT` を受けたら `unsubscribe()` でリスナ解除し後始末する。
- 購読は `bridge.onEvenHubEvent(handler)` が返す `unsubscribe` 関数で解除。`window.addEventListener('beforeunload', cleanup)` も併用。

### 4. 画面更新3手段の使い分け(SDK README)

- `createStartUpPageContainer()` = 起動時に1回だけ(2回目以降は無効)。
- `rebuildPageContainer()` = 初回ページ以降の画面全体の再構築。
- `textContainerUpgrade()` = テキストコンテナの content 部分更新。**デジタル時計はこれを使う**(コンテナ構造は変えず content だけ差し替えるため)。

### 5. background keep-alive(SDK 0.0.10 Changelog)

「Enhanced WebView background keep-alive capability」。常時表示アプリ(将来のタイマー)に有利な材料。デジタル時計でも `setInterval` が背面遷移後も動くかはシミュレータで観察できると望ましいが、本案件の必須スコープではない(シミュレータはステータスイベント非発火・前面固定のため、背面挙動の正確な検証は実機待ち)。

## シミュレータ(0.7.3)の関連事項

- automation API は feat-001 で実証済み。`/api/screenshot/glasses`(576×288 RGBA PNG)を**時間をおいて複数回取得**すれば、秒の進行を客観確認できる。
- 対応入力は Up / Down / Click / Double Click。ダブルタップ終了の検証は `POST /api/input {"action":"double_click"}` で送れる(イベントコンテナが存在する間のみ有効)。
- 実機との差異: フォントレンダリング・色(4bit)・リスト挙動。時刻の桁送りで数字の見た目が変わるが、レイアウト検証には十分。
- ステータスイベントは非発火・ユーザー/デバイス情報ハードコード・前面固定。よって背面遷移やライフサイクル系の厳密検証は不可。

## design.md への示唆

- **プロジェクト構成は feat-001 の `app/` を継続使用**。新規ライブラリ導入は不要(`even_hub_sdk` 0.0.10、Vite、simulator 0.7.3 を流用)。
- `app/src/main.ts` を Hello World 表示からデジタル時計に**置き換える**(feat-001 の構造を土台に拡張)。
- 時刻取得は標準 `Date` を使う。`HH:MM:SS` を 24 時間制・ゼロ埋め2桁でフォーマットする純粋関数を切り出す(テスト容易性のため)。
- 更新ループは `setInterval(1000)`。ただし `setInterval` は秒境界とずれるため、**毎回 `Date` を読み直して現在時刻を反映**する(累積ドリフトを文字列に持ち込まない)。
- 終了処理(ダブルタップ)・後始末(interval clear / unsubscribe)を実装する。
- 検証は automation API のスクショ複数回取得 + console ログで自動確認 → ユーザー手動テスト。
</content>
</invoke>

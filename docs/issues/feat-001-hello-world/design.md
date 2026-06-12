# feat-001 機能設計書: シミュレーターで Hello World

作成日: 2026-06-12
準拠基準: `docs/DESIGN_STANDARD.md`
関連文書: [requirements.md](requirements.md)(要求仕様書)、[research.md](research.md)(技術調査結果)

## 1. 対応要求マッピング

| 要求ID | 要求名 | 対応する設計セクション | 主な成果物 |
|--------|--------|------------------------|------------|
| FR-001 | Hello World 表示 | 4.1(詳細設計)、5(状態遷移)、7(インターフェース定義) | `app/src/main.ts` ほか app/ 一式 |
| FR-002 | 起動手順のドキュメント化 | 4.2(起動手順書の設計) | `app/README.md` |
| FR-003 | 表示失敗時のエラーログ出力 | 4.1(エラーハンドリング)、8(ログ設計) | `app/src/main.ts` 内のエラー処理 |

## 2. システム構成

### 2.1 実行時の構成図

```
┌──────────────────────────────────────────────┐
│ このPC (Ubuntu 24.04, X11)                     │
│                                                │
│  [Vite dev server]  ←HTTP(127.0.0.1:5173)─┐   │
│   app/ を配信                              │   │
│                                            │   │
│  [evenhub-simulator 0.7.3] ────────────────┘   │
│   ├─ WebView: index.html + main.ts を実行      │
│   │    └─ EvenAppBridge ←→ シミュレータ本体     │
│   ├─ グラス画面(576×288)を描画                │
│   └─ automation API (127.0.0.1:9898, 検証用)   │
└──────────────────────────────────────────────┘
```

### 2.2 モジュール構成と依存関係

| モジュール | 責務 | 依存先 |
|------------|------|--------|
| `app/src/main.ts` | エントリポイント。ブリッジ取得 → テキストコンテナ作成 → 結果ログ出力 | `@evenrealities/even_hub_sdk` |
| `app/index.html` | WebView に読み込まれる HTML。main.ts をモジュールとして読み込む | `app/src/main.ts` |
| `app/vite.config.ts` | dev server の設定(バインド先・ポート固定) | `vite` |

依存方向は `index.html → main.ts → SDK` の一方向のみ。循環依存なし。

## 3. 技術スタック

| 項目 | 名称・バージョン | 選定理由 |
|------|------------------|----------|
| 言語 | TypeScript 6.0.3(`~6.0.3` で固定) | プロジェクト方針(TECH_STACK.md)。2026-06-12 時点の npm latest |
| ビルドツール | Vite 8.0.16(`^8.0.16`) | 公式ドキュメントの例示構成。2026-06-12 時点の npm latest |
| SDK | `@evenrealities/even_hub_sdk` 0.0.10(完全固定) | 公式SDK。research.md で動作モデルを確認済み |
| シミュレータ | `@evenrealities/evenhub-simulator` 0.7.3(完全固定) | 公式シミュレータ。このPCでの起動を実証済み |
| パッケージ管理 | npm 11.6.2(`app/package.json` + `package-lock.json`) | Node.js 付属 |
| UIフレームワーク | 使用しない(vanilla TypeScript) | requirements.md 5.2 の制約 |

SDK とシミュレータはバージョン互換性の事故を避けるためキャレットなしの完全固定とする。

## 4. 各機能の詳細設計

### 4.1 FR-001 / FR-003: Hello World 表示とエラーログ

#### データフロー

```
ページロード
  → waitForEvenAppBridge() ……… 出力: EvenAppBridge インスタンス
  → bridge.createStartUpPageContainer(payload) ……… 入力: 下表の payload
  → 戻り値 result: number(0=Success / 1=Invalid / 2=Oversize / 3=OutOfMemory)
  → グラス画面への描画はホスト(シミュレータ)側が行う
```

`createStartUpPageContainer` に渡す payload(全フィールドの値を確定):

| フィールド | 値 | 型 | 値域・制約(SDK 0.0.10) | 根拠 |
|------------|-----|-----|--------------------------|------|
| `containerTotalNum` | `1` | number | 1〜12 | テキストコンテナ1個のみ |
| `textObject[0].xPosition` | `138` | number | 0〜576 | 中央配置: (576−300)/2 |
| `textObject[0].yPosition` | `104` | number | 0〜288 | 中央配置: (288−80)/2 |
| `textObject[0].width` | `300` | number | 0〜576 | 「Hello World」(11文字)に対し見切れ回避の余裕を持たせた幅 |
| `textObject[0].height` | `80` | number | 0〜288 | 1行テキストに対し余裕を持たせた高さ |
| `textObject[0].containerID` | `1` | number | 任意の数値 | 単一コンテナなので 1 |
| `textObject[0].containerName` | `'hello-text'` | string | 最大16文字 | 10文字で制約内 |
| `textObject[0].content` | `'Hello World'` | string | 最大1000文字 | requirements.md 用語定義の「表示文字列」 |
| `textObject[0].isEventCapture` | `1` | number | 0 か 1。ページ内でちょうど1つが 1 | 唯一のコンテナのため必須で 1 |

borderWidth / borderColor / borderRadius / paddingLength は指定しない(省略)。シミュレータ v0.7.0 以降のデフォルト(枠なし)に任せる。

#### 処理ロジック(main.ts の手順)

```
1. console.log('[hello] page loaded') を出力する
2. ブリッジ取得を開始し、8000ms のタイムアウトと競争させる
   2a. 8000ms 以内に取得できた場合 → console.log('[hello] bridge acquired') を出力し 3 へ
   2b. タイムアウトした場合 → console.error(タイムアウトメッセージ)を出力し、処理を終了する(リトライしない)
3. 上表の payload で createStartUpPageContainer を呼ぶ
   3a. 戻り値が 0 の場合 → console.log('[hello] displayed: Hello World') を出力し、正常終了
   3b. 戻り値が 0 以外の場合 → console.error(戻り値と意味を含むメッセージ)を出力し、処理を終了する(リトライしない)
4. 手順1〜3 の途中で例外が送出された場合 → main() 末尾の catch で console.error('[hello] unhandled error:', err) を出力する
```

ループは存在しない。分岐は 2a/2b、3a/3b、および例外経路の計5経路で全列挙済み。

#### エラーハンドリング

| エラー | 検出方法 | リカバリ動作 | ログ出力(console.error) |
|--------|----------|--------------|---------------------------|
| ブリッジ取得タイムアウト(普通のブラウザで開いた場合を含む) | 8000ms のタイマーとの `Promise.race` 相当 | なし(処理終了。リトライしない) | `[hello] bridge not available within 8000ms — open this page via evenhub-simulator, not a normal browser` |
| コンテナ作成失敗 | 戻り値 `result !== 0` | なし(処理終了。リトライしない) | `[hello] createStartUpPageContainer failed: result=<N> (<Invalid\|Oversize\|OutOfMemory\|Unknown>)` |
| 予期しない例外(SDK 内部エラー等) | `main().catch(...)` | なし(処理終了) | `[hello] unhandled error: <err>` |

リトライを行わない理由: 本案件は環境検証が目的であり、失敗を隠さず即座に可視化することが診断に有利なため(ADR-4)。

#### 境界条件

| 条件 | 振る舞い |
|------|----------|
| シミュレータ外(普通のブラウザ)で開いた | ブリッジが存在しないため 8000ms 後にタイムアウトのエラーログを出して終了する |
| WebView のページリロード | `createStartUpPageContainer` は「アプリ起動後1回だけ」の制約があるが、リロード後の挙動はホスト実装依存で公式情報がない。**確実な再表示手段はシミュレータの再起動**とし、手順書(4.2)にもそのように記載する。リロード時の表示は受け入れ基準に含めない |
| dev server 未起動でシミュレータを起動 | シミュレータの WebView がページ読み込みに失敗する(アプリコードは実行されない)。automation API の `/api/console` に `[fetch]` 系のエラーが記録される。手順書では dev server → シミュレータの順で起動するよう記載する |
| ポート 5173 が他プロセスに使用されている | `strictPort: true` により dev server が即座にエラー終了する(別ポートへ逃げて手順と不整合になる事故を防ぐ) |

### 4.2 FR-002: 起動手順書(`app/README.md`)の設計

手順書は以下の章立て・内容で作成する(コマンドはこの設計で確定):

1. **前提条件**: Ubuntu 24.04.3 LTS、Node.js v24.11.1、npm 11.6.2、X11 ディスプレイ環境(`DISPLAY` が設定されたデスクトップ)— requirements.md 4.2 の対応環境と同一に固定する(参考情報として SDK の Node 要件は `^20.0.0 || >=22.0.0` だが、本案件で動作を保証するのは上記バージョンのみ、と手順書にも明記する)
2. **インストール**: `app/` ディレクトリで `npm install` を1回実行する
3. **起動**(ターミナル2つ):
   - ターミナル1: `npm run dev`(dev server。`http://127.0.0.1:5173` で待ち受け)
   - ターミナル2: `npm run sim`(シミュレータが起動し、上記URLを読み込む)
4. **表示確認**: シミュレータのグラス画面(上側の横長領域)中央に「Hello World」が表示されること
5. **停止**: 各ターミナルで `Ctrl+C`(シミュレータはウィンドウを閉じてもよい)
6. **再表示したいとき**: シミュレータを再起動する(ページリロードではなく。理由は 4.1 境界条件参照)
7. **トラブルシュート**: ポート使用中エラーの対処(既存プロセスの停止)、グラス画面に何も出ないときの確認点(dev server 起動順、`npm run sim:auto` + `curl http://127.0.0.1:9898/api/console` でのログ確認)

## 5. 状態遷移

本アプリは UI 操作を受け付けない逐次処理であり、保持する状態変数はない。処理フェーズの遷移のみを示す:

```
LOADED ──ブリッジ取得成功──→ BRIDGE_ACQUIRED ──result=0──→ DISPLAYED(終端)
   │                              │
   └──8000msタイムアウト──→ FAILED(終端)  └──result≠0 / 例外──→ FAILED(終端)
```

- 各遷移は一方向で、FAILED / DISPLAYED から他状態への遷移はない
- 不正な遷移は存在しない(イベント駆動ではなく逐次実行のため)

## 6. ファイル・ディレクトリ設計

### 6.1 作成するファイル一覧(全7ファイル)

```
app/
├── README.md            # FR-002 起動手順書(章立ては 4.2 で確定)
├── package.json         # 6.2 で内容確定
├── package-lock.json    # npm install が自動生成
├── tsconfig.json        # 6.3 で内容確定
├── vite.config.ts       # 6.4 で内容確定
├── index.html           # 6.5 で内容確定
└── src/
    ├── main.ts          # 7.1 で内容確定(処理は 4.1)
    └── vite-env.d.ts    # 6.6 で内容確定
```

ビルド成果物は生成しない(本番ビルドはスコープ外)。`app/node_modules/` は `.gitignore` に追加する(6.7)。

### 6.2 `app/package.json`

```json
{
  "name": "tabatimer-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "sim": "evenhub-simulator http://127.0.0.1:5173",
    "sim:auto": "evenhub-simulator http://127.0.0.1:5173 --automation-port 9898",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@evenrealities/even_hub_sdk": "0.0.10"
  },
  "devDependencies": {
    "@evenrealities/evenhub-simulator": "0.7.3",
    "typescript": "~6.0.3",
    "vite": "^8.0.16"
  }
}
```

- `sim` はユーザーの手動確認用、`sim:auto` は Claude Code の自動検証用(automation API ポート 9898 付き)

### 6.3 `app/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vite.config.ts"]
}
```

### 6.4 `app/vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});
```

- `host: '127.0.0.1'`: requirements.md 4.4(localhost のみ)に対応
- `strictPort: true`: ポート使用中なら即エラーにし、手順書・シミュレータURLとの不整合を防ぐ

### 6.5 `app/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TabaTimer</title>
  </head>
  <body>
    <p>TabaTimer dev page — glasses UI is rendered by the simulator.</p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

WebView 側(スマホ画面相当)の表示は本案件のスコープ外のため、説明1行のみとする。

### 6.6 `app/src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />
```

### 6.7 リポジトリの `.gitignore` への追記

```
app/node_modules/
```

## 7. インターフェース定義

### 7.1 `app/src/main.ts` の関数

| 関数 | シグネチャ | 責務 |
|------|-----------|------|
| `waitForBridgeWithTimeout` | `(timeoutMs: number) => Promise<EvenAppBridge>` | `waitForEvenAppBridge()` にタイムアウトを付ける。タイムアウト時は `Error` で reject(タイマーは取得成功時に `clearTimeout` する) |
| `main` | `() => Promise<void>` | 4.1 の処理ロジック全体。戻り値は使用しない |

モジュールトップレベルで `main().catch(...)` を1回呼ぶ。export は不要(エントリポイントのため)。

定数(main.ts 冒頭で定義):

| 定数 | 値 | 用途 |
|------|-----|------|
| `BRIDGE_TIMEOUT_MS` | `8000` | ブリッジ取得タイムアウト |
| `DISPLAY_TEXT` | `'Hello World'` | 表示文字列(requirements.md 用語定義) |

### 7.2 実装コード形(意図の伝達用)

以下は設計意図を示すコード形である。実装時に型エラー等で細部調整が必要な場合も、**処理順序・定数値・ログ文言・payload の値は本設計のとおりとする**こと。

```typescript
import { waitForEvenAppBridge, EvenAppBridge } from '@evenrealities/even_hub_sdk';

const BRIDGE_TIMEOUT_MS = 8000;
const DISPLAY_TEXT = 'Hello World';

function waitForBridgeWithTimeout(timeoutMs: number): Promise<EvenAppBridge> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`bridge not available within ${timeoutMs}ms`)),
      timeoutMs,
    );
    waitForEvenAppBridge().then((bridge) => {
      clearTimeout(timer);
      resolve(bridge);
    });
  });
}

async function main(): Promise<void> {
  console.log('[hello] page loaded');

  let bridge: EvenAppBridge;
  try {
    bridge = await waitForBridgeWithTimeout(BRIDGE_TIMEOUT_MS);
  } catch (err) {
    console.error(
      `[hello] ${(err as Error).message} — open this page via evenhub-simulator, not a normal browser`,
    );
    return;
  }
  console.log('[hello] bridge acquired');

  const result = await bridge.createStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [
      {
        xPosition: 138,
        yPosition: 104,
        width: 300,
        height: 80,
        containerID: 1,
        containerName: 'hello-text',
        content: DISPLAY_TEXT,
        isEventCapture: 1,
      },
    ],
  });

  if (result === 0) {
    console.log(`[hello] displayed: ${DISPLAY_TEXT}`);
  } else {
    const meaning =
      ({ 1: 'Invalid', 2: 'Oversize', 3: 'OutOfMemory' } as Record<number, string>)[result] ??
      'Unknown';
    console.error(`[hello] createStartUpPageContainer failed: result=${result} (${meaning})`);
  }
}

main().catch((err) => {
  console.error('[hello] unhandled error:', err);
});
```

注: `EvenAppBridge` の型 import の形(`import type` の要否)は `verbatimModuleSyntax` の指摘に従って実装時に調整してよい。

## 8. ログ・デバッグ設計

- ログ出力先: WebView の `console`(シミュレータの automation API `GET /api/console` で取得できる)
- すべてのログに `[hello]` プレフィクスを付ける(他のログとの区別のため)
- レベルの使い分け: 進行の記録は `console.log`(INFO 相当)、処理を中断する失敗は `console.error`(ERROR 相当)。DEBUG / WARNING 相当のログは本案件では使用しない

| 出力ポイント | レベル | メッセージ |
|--------------|--------|-----------|
| ページロード直後 | log | `[hello] page loaded` |
| ブリッジ取得成功 | log | `[hello] bridge acquired` |
| 表示成功(result=0) | log | `[hello] displayed: Hello World` |
| ブリッジタイムアウト | error | `[hello] bridge not available within 8000ms — open this page via evenhub-simulator, not a normal browser` |
| コンテナ作成失敗 | error | `[hello] createStartUpPageContainer failed: result=<N> (<意味>)` |
| 予期しない例外 | error | `[hello] unhandled error: <err>` |

## 9. 実装ステップでの検証手順

実装完了後、手動テスト(ユーザー)の前に Claude Code が以下を確認する:

1. `npm run typecheck`(app/ にて)が exit code 0 で完了する
2. `npm run dev` と `npm run sim:auto` をバックグラウンド起動し、`GET http://127.0.0.1:9898/api/console` に `[hello] displayed: Hello World` が記録されている(FR-001/FR-003 のログ設計どおり)
3. `GET http://127.0.0.1:9898/api/screenshot/glasses` で取得した PNG を Claude Code が画像として読み込み、「Hello World」が写っていることを目視相当(画像読解)で確認する。OCR 等の自動文字認識は用いない(FR-001 受け入れ基準3)
4. 起動した検証用プロセスをすべて停止する

## 10. 設計判断の記録(簡易ADR)

| # | 判断 | 採用案 | 却下案と理由 |
|---|------|--------|--------------|
| ADR-1 | プロジェクトの作り方 | 全ファイルを本設計書で確定し手書きで作成 | `npm create vite@latest`: 対話プロンプトがあり、テンプレートのバージョンで生成物が変わるため決定性に欠ける。不要ファイル(counter.ts 等)の削除工程も増える |
| ADR-2 | シミュレータの導入先 | `app/` の devDependencies(バージョン 0.7.3 固定) | グローバルインストール(公式README の例示): PC 環境を汚し、バージョンがプロジェクトに紐づかないため |
| ADR-3 | dev server の設定 | 127.0.0.1 バインド・ポート 5173 固定・strictPort | デフォルト設定のまま: ポートが使用中だと自動で別ポートに移り、シミュレータに渡す URL と食い違う事故が起きるため |
| ADR-4 | 失敗時のリトライ | リトライなし(即エラーログ・終了) | 自動リトライ: 環境検証という目的に対し失敗の可視化が遅れ、原因の切り分けが難しくなるため |
| ADR-5 | ブリッジ取得の待ち時間 | 8000ms でタイムアウト | 無期限待ち(SDK 素の挙動): 普通のブラウザで開いた場合に何も起きず原因不明になるため。FR-001 の「10秒以内表示」から逆算して 8000ms とした |
| ADR-6 | テキストの配置 | 300×80 のコンテナを画面中央(138, 104)に配置 | 画面全面(0,0,576,288): フォントレンダリング位置がコンテナ内のどこになるかシミュレータ実装依存のため、中央寄せの確実性が下がる。余白付き中央配置が見切れリスクと両立する |
| ADR-7 | automation API の扱い | `sim`(なし)と `sim:auto`(9898)の2スクリプトに分離 | 常に有効化: ユーザーの手動確認にはポート占有が不要であり、用途を明確に分けるため |

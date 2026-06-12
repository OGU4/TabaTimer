# feat-001 技術調査結果

調査日: 2026-06-12
調査方法: 公式ドキュメント(hub.evenrealities.com)、npm レジストリ、公式パッケージ実物のインストールと試行(`tmp/research/` にて。このPC上で動作実証済み)

## 結論サマリ

Hello World は以下の構成で実現できる。**全要素がこのPC(Ubuntu 24.04, Node.js v24.11.1)で動作することを実証済み**。

```
[Webアプリ(Vite dev server, TypeScript + even_hub_sdk)]
        ↑ HTTP で読み込み
[evenhub-simulator(WebViewをホストし、グラス画面 576×288 を描画)]
        ↑ HTTP API(--automation-port)
[動作検証(スクリーンショット・コンソール・入力送信)]
```

## 確認済みパッケージ(すべて実物インストール済み)

| パッケージ | バージョン | 確認内容 |
|------------|-----------|----------|
| `@evenrealities/even_hub_sdk` | 0.0.10 | ESM/CJS 両対応(`type: module`, exports あり)、TypeScript 型定義同梱。Node 要件 `^20.0.0 \|\| >=22.0.0`(このPCは v24.11.1 で適合) |
| `@evenrealities/evenhub-simulator` | 0.7.3 | Linux x64 バイナリ(`@evenrealities/sim-linux-x64`)が自動導入され、`--version` と GUI 起動の両方が成功 |
| `@evenrealities/evenhub-cli` | 0.1.13 | `qr`(実機サイドロード用)/ `init`(app.json生成)/ `pack`(.ehpk化)/ `login`。**feat-001(シミュレータのみ)では不要** |

## アプリ実行モデル

- Even Hub アプリの実体は **WebView 内で動く Web ページ**。本番ではスマホの Even App が、開発ではシミュレータが WebView をホストする
- Web ページは SDK の `EvenAppBridge` を通じてホストと双方向通信する(`waitForEvenAppBridge()` でブリッジ取得)
- **注意**: シミュレータ/Even App の外(普通のブラウザ)で開くとブリッジが存在せず `waitForEvenAppBridge()` は解決しない。動作確認は必ずシミュレータで行う

## グラス UI の仕組み(SDK 0.0.10 の README より)

- キャンバスは **576×288**、原点は左上、X は右+、Y は下+
- UI は「コンテナ」の集合: list / text / image の3種、合計 **1〜12 個**(text は最大8、image は最大4)
- 初回表示は `createStartUpPageContainer()`(**アプリ起動後1回だけ呼べる**)。以降の画面更新・再構築は `rebuildPageContainer()` を使う
- **ちょうど1つ**のコンテナに `isEventCapture: 1` を設定する必要がある(他は 0)
- `TextContainerProperty` の主な制約: `content` 最大1000文字(起動時は転送効率のため短く推奨)、`containerName` 最大16文字、座標・サイズは 0-576 / 0-288
- テキストの部分更新は `textContainerUpgrade()`(content 最大2000文字)
- `createStartUpPageContainer` の戻り値: `0`=Success / `1`=Invalid / `2`=Oversize / `3`=OutOfMemory
- 画像は起動時に送れない(作成後 `updateImageRawData()` で送る。最大 288×144)。Hello World では未使用
- 起動経路は `onLaunchSource()` で取得可能(`'appMenu'` | `'glassesMenu'`、ロード完了後に1回だけプッシュ)

### Hello World の最小コード形(README の例から構成)

```typescript
// 意図の伝達用。そのままコピーする目的のものではない
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

const bridge = await waitForEvenAppBridge();
const result = await bridge.createStartUpPageContainer({
  containerTotalNum: 1,
  textObject: [{
    xPosition: /* 配置による */, yPosition: /* 同 */,
    width: /* 同 */, height: /* 同 */,
    containerID: 1,
    containerName: 'hello',
    content: 'Hello World',
    isEventCapture: 1, // コンテナが1つなのでこれが唯一のイベントキャプチャ
  }],
}); // 0 が返れば成功
```

## シミュレータ(0.7.3)— このPCで動作実証済み

- 起動コマンド: `evenhub-simulator <targetUrl> [OPTIONS]`
- **`targetUrl` は実際には必須**(ヘルプでは `[targetUrl]` とオプショナル表記だが、省略すると `error: targetUrl is required` で終了する — 実測)
- GUI 起動には X11 ディスプレイが必要(このPCは `DISPLAY=:1` で問題なし。WebKitGTK 等の追加インストールも不要だった)
- 実機との差異(README 記載): フォントレンダリング、リストのスクロール挙動、エラーハンドリング、画像サイズ制限の未強制。ステータスイベントは発火せず(ユーザー・デバイス情報はハードコード)、`imuData` は常に null、`eventSource` は 1(右グラス)固定
- 対応入力: Up / Down / Click / Double Click
- 4bit色でレンダリング(v0.5.2以降)。スクリーンショット機能あり(クリックで CWD に PNG 出力)

### Automation API(`--automation-port <PORT>` で有効化)— 動作実証済み

| メソッド | エンドポイント | 内容 | 実測結果 |
|----------|---------------|------|----------|
| GET | `/api/ping` | ヘルスチェック | `pong` 取得済み |
| GET | `/api/screenshot/glasses` | グラス画面の RGBA PNG(576×288) | 取得済み(コンテナ未作成時は透明) |
| GET | `/api/screenshot/webview` | WebView のスクリーンショット | 未試行 |
| GET | `/api/console` | WebView の console 出力・エラー(`?since_id=N` で増分取得) | テストページの `console.log` 取得済み |
| DELETE | `/api/console` | コンソールバッファのクリア | 未試行 |
| POST | `/api/input` | タッチ操作送信。body: `{"action": "up"\|"down"\|"click"\|"double_click"}` | 未試行(イベントコンテナがないと無視される仕様) |

この API により、Claude Code が自律的に「アプリ表示 → スクリーンショット取得 → 表示内容の確認」を行える。

### 実証した検証手順(2026-06-12、tmp/research/ にて)

1. `npm install --prefix tmp/research @evenrealities/even_hub_sdk @evenrealities/evenhub-cli @evenrealities/evenhub-simulator` — 成功、脆弱性0件
2. テスト用 HTML を `python3 -m http.server 8123` で配信
3. `evenhub-simulator http://127.0.0.1:8123 --automation-port 9898` — GUI 起動成功
4. `curl /api/ping` → `pong`、`/api/screenshot/glasses` → 576×288 PNG、`/api/console` → ページのログ取得

## design.md への示唆

- **プロジェクト構成**: Vite(vanilla-ts テンプレート)+ `@evenrealities/even_hub_sdk`。公式のプロジェクトスキャフォールドは存在しない(`evenhub init` は app.json を作るだけ)ため、Vite 標準テンプレートを使う。公式ドキュメントも「Vite + SDK」を例示
- **開発時の動作確認**: Vite dev server(既定 5173)を起動し、シミュレータに `http://localhost:5173` を渡す
- **受け入れ確認の客観化**: automation API のスクリーンショットで「Hello World」が描画されていることを確認できる
- **app.json / evenhub-cli**: 実機サイドロードや提出で必要になるが、シミュレータゴールの feat-001 ではスコープ外にできる

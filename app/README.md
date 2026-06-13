# TabaTimer アプリ(feat-001: Hello World)

Even Hub アプリとしての TabaTimer。現在はシミュレータのグラス画面に「Hello World」を表示する段階(feat-001)。

## 1. 前提条件

| 項目 | バージョン・条件 |
|------|------------------|
| OS | Ubuntu 24.04.3 LTS |
| Node.js | v24.11.1 |
| npm | 11.6.2 |
| ディスプレイ | X11 環境(`DISPLAY` 環境変数が設定されたデスクトップ) |

参考: SDK 自体の Node.js 要件は `^20.0.0 || >=22.0.0` だが、本プロジェクトで動作を保証するのは上記バージョンのみ。

## 2. インストール(初回のみ)

```bash
cd app
npm install
```

## 3. 起動

ターミナルを2つ使う。**必ず dev server(ターミナル1)を先に起動すること。**

ターミナル1(dev server):

```bash
cd app
npm run dev
```

`http://127.0.0.1:5173/` で待ち受けが始まるのを確認する。

ターミナル2(シミュレータ):

```bash
cd app
npm run sim
```

シミュレータのウィンドウが開く。

## 4. 表示確認

シミュレータのグラス画面(上側の横長領域)の中央に「Hello World」が表示されれば成功。

## 5. 停止

- ターミナル1・2 それぞれで `Ctrl+C`(シミュレータはウィンドウを閉じてもよい)

## 6. 再表示したいとき

シミュレータを再起動する(`npm run sim` をやり直す)。ページリロードではなくシミュレータの再起動が確実な再表示手段(グラス UI の初期化 API がアプリ起動後1回しか呼べないため)。

## 7. トラブルシュート

### ポート使用中エラーが出る

dev server が `Port 5173 is already in use` で終了する場合、別の dev server が動いている。既存のプロセスを停止(`Ctrl+C`)してから再実行する。

### グラス画面に何も表示されない

1. dev server(ターミナル1)が先に起動しているか確認する
2. シミュレータを `npm run sim:auto` で起動し直し、別ターミナルで以下を実行してアプリのログを確認する:

```bash
curl -s http://127.0.0.1:9898/api/console
```

- `[hello] displayed: Hello World` があれば表示処理は成功している
- `[hello] bridge not available ...` があればシミュレータ経由で開かれていない
- `[hello] createStartUpPageContainer failed: result=...` があれば、そのエラー内容を案件の investigation.md に記録して調査する
- `[fetch]` 系のエラーがあれば dev server が起動していない

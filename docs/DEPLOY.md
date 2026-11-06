# 公開と再デプロイ

通常は、このrepoのルートをVercelのプロジェクトに指定します。`npm run build` がフロントと単一APIを生成し、`vercel.json` の `dist` を静的配信します。Node.js 22.xを使います。初期状態はmockで、鍵は不要です。

## ローカルでビルドした成果物を配布する方法

公開先での依存インストールを省くための代替です。

```sh
npm ci
npm run build
npx tsx scripts/prepare-release.ts
TEST_API_ENTRY=../release/api/timeline.js npx tsx scripts/verify-bundle.ts
```

`release/` に、`public/`（静的フロント）、`api/timeline.js`（依存を束ねた関数）、配布用の `package.json` と `vercel.json` ができます。配布用は依存インストール・ビルドを省略します。元のソースを置き換えません。

Vercel CLIにログインした環境では、`release/` をデプロイ対象として指定できます。開発時の公開には Vercel のファイルアップロード・デプロイ API を使いました。審査用の公開 URL は、そのプロジェクトだけ認証保護を無効にし、ログインなしで開ける設定です。

## AIの設定

本物のAIで審査する場合は、サーバー環境変数 `AI_PROVIDER`、`AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY`、`RATE_LIMIT_SECRET` をVercelの画面で設定し、再デプロイします。鍵はブラウザに入力させません。詳細はREADMEを参照してください。

## 公開後の確認

`/api/timeline` のGETは `provider` と `version` だけを返します。キー等は返しません。ログインしていないブラウザで、以下を実行します。

```sh
TEST_BASE_URL=https://公開したホスト npm run verify:ui
```

3見本・新しい住所と家族・共有リンク・異常時を確認します。公開確認の結果は記録に残し、公開が未完了なら成功扱いにしません。

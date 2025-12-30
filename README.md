# ATcircle

ATProtoを利用したモダンなウェブリング。

## 概要

ATcircle は、分散型 SNS プロトコルである ATProto
を活用し、個人サイト同士を繋ぐプラットフォームです。
かつての個人サイト文化にあったウェブリングを、ATProtoで再現しようという試みです。

## 特徴

- **Bluesky 連携 (OAuth)**: Bluesky ハンドルでログインできます。
- **ウェブリング作成・管理**:
  独自のテーマでサークルを作成し、メンバーを招待・管理できます。
- **カスタムウィジェット**:
  サイトに埋め込み可能なナビゲーションウィジェット（前へ・次へ・ランダム）。
- **アンテナ (RSS集約)**: 参加サイトの更新情報を一括で表示。
- **OPML エクスポート**: リング内のサイトをまとめて RSS リーダーに登録可能。

## 技術スタック

- **Framework**: [Hono](https://hono.dev/)
- **Runtime**: [Node.js](https://nodejs.org/) (>= 24)
- **Database**: SQLite (`node:sqlite`)
- **Infrastructure**: [Fly.io](https://fly.io/) (Docker)
- **Auth**: [ATProto OAuthClient](https://github.com/bluesky-social/atproto)

---

# ATcircle

A modern webring using ATProto.

## Overview

ATcircle is a platform that connects personal websites using the decentralized
SNS protocol, ATProto. It is an attempt to recreate the webring culture once
found in personal sites using ATProto.

## Features

- **Bluesky Integration (OAuth)**: Log in with your Bluesky handle.
- **Webring Management**: Create circles with custom themes and manage members.
- **Custom Widget**: Embeddable navigation widget for member sites
  (Prev/Next/Random).
- **Antenna (RSS Aggregation)**: A unified feed of recent updates from all
  members.
- **OPML Export**: Easily export the subscription list for your favorite RSS
  reader.

## Tech Stack

- **Framework**: [Hono](https://hono.dev/)
- **Runtime**: [Node.js](https://nodejs.org/) (>= 24)
- **Database**: SQLite (`node:sqlite`)
- **Infrastructure**: [Fly.io](https://fly.io/) (Docker)
- **Auth**: [ATProto OAuthClient](https://github.com/bluesky-social/atproto)

## Getting Started / 開発の始め方

### Prerequisites / 前提条件

- **Node.js**: >= 24
- **npm** or **bun**

### Installation / インストール

1. Clone the repository / リポジトリをクローン:
   ```bash
   git clone https://github.com/asadaame5121/atcircle.git
   cd atcircle
   ```
2. Install dependencies / 依存関係のインストール:
   ```bash
   npm install
   ```

### Local Development / ローカル開発

1. Start the dev server / 開発サーバーの起動:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:8080` in your browser.

### Configuration / 設定

以下の環境変数を設定してください (.env ファイルなど): Set the following
environment variables (e.g., in a `.env` file):

- `PUBLIC_URL`: サイトの公開 URL (例: `https://at-circle.example.com`)
- `SECRET_KEY`: JWT セッション署名用の秘密鍵
- `OAUTH_PRIVATE_KEY`: ATProto OAuth 用の非公開鍵 (JWK形式をBase64変換したもの)

## License

MIT

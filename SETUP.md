# 経済ニュースアプリ セットアップガイド

## 開発環境の起動

```bash
# プロジェクトディレクトリに移動
cd news-app

# 依存関係のインストール（初回のみ）
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーが起動したら `http://localhost:5173` でアプリにアクセスできます。

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# 型チェック
npm run tsc
```

## プロジェクト構成

```
news-app/
├── public/             # 静的ファイル
├── src/
│   ├── components/     # Reactコンポーネント
│   ├── services/       # ビジネスロジック
│   ├── types/         # TypeScript型定義
│   ├── App.tsx        # メインアプリ
│   └── App.css        # スタイル
├── package.json       # 依存関係
└── vite.config.ts     # Vite設定
```

## 機能一覧

- ✅ ニュース記事の表示
- ✅ カテゴリー別フィルタリング
- ✅ キーワード検索
- ✅ ブックマーク機能
- ✅ レスポンシブデザイン

## 保存されたファイル

すべてのソースコードは `C:\Users\yasuy\news-app` に保存されています。
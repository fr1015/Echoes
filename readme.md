# Echoes

Flaskで開発した個人向けSNSライクマイクロブログアプリです。
X（旧Twitter）やMisskeyを参考に、投稿・検索・ハッシュタグ管理・プロフィール履歴管理などの機能を実装しています。

---

## 主な機能

* 投稿作成
* 投稿編集
* 論理削除
* 画像・動画投稿
* ハッシュタグ機能
* 無限スクロール
* 投稿検索
* プロフィール変更履歴管理

---

## 使用技術

### Backend

* Python
* Flask
* SQLAlchemy
* SQLite

### Frontend

* HTML
* CSS
* JavaScript

### Version Control

* Git
* GitHub

---

## 画面イメージ

### ホーム画面

![Home](https://github.com/user-attachments/assets/9a23e519-888b-4470-99d0-e9dfd6e6cabc)

### 検索画面

![Search](https://github-production-user-asset-6210df.s3.amazonaws.com/108813087/605078932-9a23e519-888b-4470-99d0-e9dfd6e6cabc.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20260609%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260609T122426Z&X-Amz-Expires=300&X-Amz-Signature=6b21220a95338c93292336dde6d3e5c41b7e80b144f74a2ff4bafaec7fd5a662&X-Amz-SignedHeaders=host&response-content-type=image%2Fpng)

### プロフィール画面

![Profile](images/profile.png)

---


## 技術的な工夫

### ハッシュタグ管理

投稿内容からハッシュタグを抽出し、タグテーブルと中間テーブルで管理しています。

### プロフィール履歴

ユーザー情報の変更時に履歴テーブルへ保存し、過去の状態を保持しています。

### 無限スクロール

ホームタイムラインで追加読み込みを行い、大量の投稿を快適に閲覧できます。


---

## 今後の実装予定

* リプライ、引用リプライ、リポスト
* プロフィール編集機能
* ポストインポート
* ポストエクスポート
* MIME実体判定によるアップロード制御

---

## 参考サービス

* Misskey
* X (Twitter)
* NoteStock
* Twisave

---

## 制作者

GitHub:
https://github.com/fr1015

制作期間:
2026年3月～


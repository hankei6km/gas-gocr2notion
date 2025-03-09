# gas-gocr2notion

Google Drive で OCR を行い、結果を Notion データベースへ送信する Google Apps Script ライブラリー。

## Setup

ライブラリーは App Script で利用できる状態になっています。
Apps Script のコードエディターで以下の手順を実行するとプロジェクトへ追加できます。

1. コードエディターのファイル名一覧が表示される部分の「ライブラリ +」をクリック
1. 「スクリプト ID」フィールドに `1phsqy39NYEBOCpGx062N9kezLOdyzRKSEgDBYt6f-zaqVdAOdn9NaWWH` を入力し検索をクリック
1. バージョンを選択(通常は最新版)
1. 「ID」を `GocrToNotion` へ変更
1. 「追加」をクリック

上記以外にも Release ページから `gas-gocr2notion.zip` をダウンロードし、`/dist` ディレクトリーをプロジェクトへコピーできます。

## Usage

Google Drive の特定のフォルダーに保存してあるファイルに OCR を行い、結果を Notion のデータベースへ送信する方法です。

### Notion 側での手順

#### データベースを作成

OCR の結果が送信されるデータベースを用意します。プロパティは標準の状態のままで追加する必要はありません。

#### Notion インテグレーションを作成

Notion 外部からデータベースを操作するためのインテグレーション(API KEY)が必要です。以下を参考に作成してください。

- [Getting started # Step 1: Create an integration.](https://developers.notion.com/docs/getting-started#step-1-create-an-integration)

#### インテグレーションへの許可

以下を参考に、用意したデータベースをインテグレーションと共有してください。

- [Getting started # Step 2: Share a database with your integration](https://developers.notion.com/docs/getting-started#step-2-share-a-database-with-your-integration)

### Google Drive 側での手順

#### スキャンされたファイルが保存されるフォルダー

スマートフォンでスキャン(カメラ撮影)した PDF などが保存されるフォルダーを作成します。
作成したらフォルダーの ID をメモしておいてください。

#### Google Apps Script で実行

スタンドアロンのスクリプトを作成し、以下の手順を実行してください。

1. 「Setup」の手順でライブラリーを追加
1. スクリプトファイルへ以下のようなコードを追加
   - `notion_api_key` にはインテグレーションの API KEY を記述
   - `database_id` には用意したデータベースの ID を記述
   - `folder_id` には作成したフォルダーの ID を記述

```js
function myFunction() {
  const apiKey = 'notion_api_key'
  const database_id = 'database_id'
  const folder_id = 'folder_id'

  const opts = {
    database_id,
    ocrOpts: [
      {
        scanFolderId: folder_id,
        ocrFolderId: folder_id,
        ocrLanguage: 'ja',
        tags: [],
        removeOcrFile: true
      }
    ]
  }

  GocrToNotion.ocr(apiKey, opts)
}
```

### OCR を行う

用意した Google Drive のフォルダーに PDF もしくは画像ファイルを保存します。

例) スマートフォンの Google Drive アプリでスキャン(カメラ利用)する。

この状態でスクリプトエディターから `myFunction` を実行すると OCR 処理が開始されます。

## 付録

追加設定などで他の機能を利用できます。

### データベースのプロパティ

Notion のデータベースに以下のプロパティを追加することで OCR のテキスト送信時にそれぞれの値がセットされます。
プロパティは必要なもののみ追加できます。

| プロパティ名   | プロパティの種類 | 内容                             |
| -------------- | ---------------- | -------------------------------- |
| `entryUpdated` | 日付             | データベースのエントリー更新日時 |
| `guid`         | テキスト         | ファイルの id                    |
| `mimeType`     | セレクト         | ファイルの mimeType              |
| `type`         | セレクト         | ファイルの種類                   |
| `tags`         | マルチセレクト   | OCR オプションで指定したタグ     |
| `タグ`         | マルチセレクト   | OCR オプションで指定したタグ     |
| `excerpt`      | テキスト         | OCR テキストの先頭 1900 バイト   |
| `link`         | URL              | ファイルへのリンク               |
| `modified`     | 日付             | ファイル更新日時                 |

### send() メソッド

`ocr()` のかわりに `send()` を使うことで Google Drive の変更通知から OCR 処理を開始できます。

これによりスマートフォンでスキャン後、短い待ち時間で Notion へテキストを追加できます。

Google Apps Script で変更通知を扱う方法については以下の記事などを参照してください。

- [Google Drive の変更通知を Google Apps Script で受け取る](https://zenn.dev/hankei6km/articles/receive-google-drive-chages-notifications-by-gas)

## 参考

Google Drive で OCR 行う方法は以下の記事を参考にしました。

- [GAS で OCR を簡単に使えるんですか！？](https://zenn.dev/harachan/articles/d910ef8b89720b)

## License

MIT License

Copyright (c) 2022 hankei6km

# 富山県 医療アクセス可視化ダッシュボード

## プロジェクト概要

本プロジェクトは、富山県内の **人口メッシュ**, **医療施設**, **公共交通停留所**, **鉄道駅** などの地理空間データを地図上で重ね合わせ、医療アクセスが困難になりやすい地域を可視化する Web ダッシュボードです。

高齢者割合、医療施設までの距離、公共交通へのアクセス状況を組み合わせて確認することで、医療アクセス支援が必要となる可能性のある地域を探索できます。

---

## 主な機能

- 500m 人口メッシュの可視化
- 高齢者割合別の色分け表示
- 人口規模別の色分け表示
- 医療アクセス優先度スコアによる地域分類
- 医療施設の表示
  - 一次医療施設
  - 二次医療施設
  - 2.5次医療施設
  - 三次医療施設
  - 一般・未分類施設
- 医療施設バッファの表示
- 鉄道駅・バス停など公共交通ポイントの表示
- 公共交通バッファの表示
- 医療施設・公共交通までの距離条件を変更しながら分析
- 日本語 / 英語の表示切り替え
- メッシュや施設をクリックした際の詳細情報ポップアップ

---

## 使用技術

### フロントエンド

- React
- Leaflet
- Vite

### バックエンド

- Flask
- Flask-CORS

### 実行環境

- Docker
- Docker Compose

---

## 必要な環境

新しい端末で実行する場合、以下をインストールしてください。

- Git
- Docker Desktop
- Docker Compose

Windows の場合は、Docker Desktop の利用と WSL 2 の有効化を推奨します。

Docker Desktop を起動した状態で、以下の手順を実行してください。

---

# 実行手順：GitHub から取得して起動する方法

## 1. リポジトリを取得する

初回実行の場合は、以下を実行します。

```bash
git clone https://github.com/anusha-pacific/tech_teamF.git
```

取得したフォルダへ移動します。
```bash
cd tech_teamF
```

## 2. 最新版を取得する場合

すでにリポジトリを持っている場合は、以下で最新版を取得します。

```bash
git pull origin main
```

## 3.  Docker で起動する

プロジェクトルートで以下を実行します。

```bash
docker compose up --build
```

初回起動時は Docker イメージのビルドに時間がかかる場合があります。

## 4.  ブラウザで開く

起動後、以下の URL にアクセスします。

```bash
http://localhost:5173
```

バックエンドの動作確認は以下で確認できます。

```bash
http://localhost:5000/api/health
```

## 5.  停止する

アプリケーションを停止する場合は、ターミナルで Ctrl + C を押します。
完全にコンテナを停止・削除する場合は以下を実行します。

```bash
docker compose down
```

## データ配置

GeoJSON データは以下のフォルダに配置します。

```text
data/geojson/
```

主な入力データは以下です。

```text
data/geojson/
├── mesh_hospital_nearest_wide.geojson
├── toyama_stops.geojson
├── hospitals.geojson
└── stations.geojson
```

---

## 主なデータ内容

### mesh_hospital_nearest_wide.geojson

人口メッシュごとの以下の情報を含みます。

- メッシュ ID
- 人口
- 高齢者人口
- 高齢者割合
- 医療施設までの距離
- 医療施設種別ごとの最近傍情報
- 公共交通アクセス情報

### hospitals.geojson

医療施設ポイントデータです。

主な属性:

- 施設名称
- 所在地
- 医療機関分類
- 診療科目
- type_ji

`type_ji` は医療施設の種類を表します。

```text
0   一般・未分類
1   一次医療施設
2   二次医療施設
2.5 2.5次医療施設
3   三次医療施設
```

### toyama_stops.geojson

富山県内の公共交通停留所データです。

主な属性:

- 停留所名
- 交通モード
- バス
- 鉄道
- 路面電車・ライトレール

### stations.geojson

鉄道駅ポイントデータです。

---

## 画面でできること

### 人口メッシュ

サイドバーから以下を切り替えできます。

- 500m メッシュの表示 / 非表示
- 高齢者割合による色分け
- 人口による色分け
- 医療アクセス優先度による色分け

### 医療施設

医療施設は以下の条件で表示を切り替えできます。

- すべて表示
- 非表示
- 一次医療施設のみ
- 二次医療施設のみ
- 2.5次医療施設のみ
- 三次医療施設のみ
- 一般・未分類のみ

また、医療施設から指定半径のバッファを表示できます。

### 公共交通

以下の表示を切り替えできます。

- 鉄道駅
- バス停
- 公共交通バッファ
- バス・鉄道を統合した分析

### 分析

医療アクセス優先度によって、表示する地域を絞り込むことができます。

例:

- アクセス良好地域
- 要観察地域
- 優先対応地域
- 最優先対応地域

---

## ディレクトリ構成例

```text
tech_teamF/
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── data/
│   └── geojson/
│       ├── mesh_hospital_nearest_wide.geojson
│       ├── hospitals.geojson
│       ├── toyama_stops.geojson
│       └── stations.geojson
├── docker-compose.yml
└── README.md
```

実際の構成はプロジェクトの更新により変更される可能性があります。

---

## よくあるエラーと対処方法

### ポートがすでに使われている

以下のようなエラーが出た場合:

```text
port is already allocated
```

既存の Docker コンテナを停止します。

```bash
docker compose down
```

その後、再度起動します。

```bash
docker compose up --build
```

---

### API が読み込めない

フロントエンドで以下のようなエラーが出る場合:

```text
Failed to fetch
```

バックエンドが起動しているか確認してください。

```text
http://localhost:5000/api/health
```

---

### hospitals.geojson が読み込めない

以下のファイルが存在するか確認してください。

```text
data/geojson/hospitals.geojson
```

ファイル名が違う場合は、バックエンド側の読み込みファイル名と一致させてください。

---

### Docker の変更が反映されない

キャッシュを使わずに再ビルドします。

```bash
docker compose build --no-cache
docker compose up
```

---

## 開発時の基本コマンド

### 起動

```bash
docker compose up --build
```

### 停止

```bash
docker compose down
```

### ログ確認

```bash
docker compose logs
```

### 最新コード取得

```bash
git pull origin main
```

### 現在のブランチ確認

```bash
git branch
```

---

## 注意事項

- 本アプリケーションは開発・分析用途のダッシュボードです。
- 表示される距離や分類は入力データに依存します。
- 実際の医療政策判断には、自治体・医療機関・交通事業者などの詳細な情報と併せて確認する必要があります。
- Docker Desktop が起動していない場合、アプリケーションは起動できません。

---

## ライセンス・利用について

本プロジェクトは技術研修・研究開発用途として作成されています。

データの利用条件については、各データ提供元のライセンスや利用規約を確認してください。

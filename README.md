# 富山県 医療アクセス可視化ダッシュボード

## 概要

本プロジェクトは、富山県内の人口メッシュ、医療施設、公共交通停留所データを地図上で重ね合わせ、医療アクセスが困難になりやすい地域を可視化する Web ダッシュボードです。

主な目的は次の通りです。

- 高齢者割合が高い地域を地図で確認する
- 医療施設までの距離や公共交通へのアクセス状況を比較する
- 半径やしきい値を変更しながら、医療アクセス困難候補を探索する

## 使用技術

- フロントエンド: React, Leaflet
- バックエンド: Flask
- 実行環境: Docker, Docker Compose

## 必要なもの

新しい端末で実行する場合、以下をインストールしてください。

- Git
- Docker Desktop
- Windows の場合は WSL 2 の有効化を推奨

Docker Desktop を起動した状態で作業してください。

## GitHub から取得して実行する方法

```bash
git clone <GitHubリポジトリURL>
cd <リポジトリ名>
docker compose up --build
```

起動後、ブラウザで以下を開きます。

```text
http://localhost:5173
```

バックエンドの確認用 URL は以下です。

```text
http://localhost:5000/api/health
```

## データ配置

GeoJSON データは以下に配置します。

```text
data/geojson/
```

現在の主な入力データ:

- `mesh_hospital_nearest_wide.geojson`: メッシュ別の人口・高齢者割合・医療施設距離情報
- `toyama_stops.geojson`: 富山県内の公共交通停留所情報
- `hospitals.geojson`: 医療施設ポイント
- `stations.geojson`: 鉄道駅ポイント

## 停止方法

```bash
docker compose down
```

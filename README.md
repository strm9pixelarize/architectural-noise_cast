# architectural-noise_cast

cast.architectural-n.net の自作トップページ (AI ラジオ「ねるるの日常(健全版)」) の
ソースとデプロイ資材を置くプライベートリポジトリ。

## 構成

- `html/` `conf.d/` — ホストで稼働中の実績 (index.html は v3)
- `v4/` — 次期版。index.html / style/style.css / script/script.js への分割と
  放送内容セクション (生成側の program_<枠>_latest.json を表示) を含む。
  デプロイ手順は `deploy/README.md` の v4 の節
- `cast-top-draft*.html` — v1〜v3 の叩き台 (単一ファイル版)
- `deploy/` — デプロイ手順、docker-compose、nginx 設定の叩き台

## 画像ファイルについて

画像・アイコン (jpg / png / ico) は投入経路の都合で未収録。実物はホストの
`html/` と、このリポジトリ管理元のローカルにある。未収録の一覧:

- ルート: cast-background-1920x1080.jpg / .png、default-album-art.png /
  default-album-art-v2.png、favicon-cast-c-v4.png、favicon.ico
- html/: cast-background-1920x1080.jpg、default-album-art-v2.png、
  favicon-cast-c-v4.png (中身は WebP の最適化版)、favicon.ico、
  logo-architectural-noise.png

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

画像・アイコン (jpg / png / ico) は 2026-11-20 に収録済み (優が VS Code から
commit & push)。html/ に配置版5点、ルートに原画3点 (背景 PNG・
アルバムアート v1・favicon の PNG 原寸) を置いている。
html/favicon-cast-c-v4.png は中身が WebP の最適化版 (94KB) で、ルートの
同名ファイル (442KB の PNG 原画) とは別物なので取り違えないこと。

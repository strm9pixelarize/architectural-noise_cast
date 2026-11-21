# cast.architectural-n.net 自作トップページ

「ねるるの日常(健全版)」(AzuraCast ステーション id 11) の公開トップページ。
このリポジトリは本番フォルダそのもので、ホストの
`/DATA/AppData/architectural-noise-cast/` に clone して使う。

## 構成

| パス | 内容 |
|---|---|
| `html/` | 公開ファイル一式 (nginx のルート) |
| `html/index.html` | トップページ |
| `html/style/style.css` | スタイル |
| `html/script/script.js` | プレイヤー・番組表・放送内容の表示 |
| `html/links.json` | 一番下のリンク欄の設定 (title / url / description / image) |
| `conf.d/nginx.conf` | nginx 設定 (CSP と /data/ の JSON 公開を含む) |

- Stack: Portainer で nginx:alpine、コンテナ名 `architectural-noise_cast`、ホスト 3104 番
- compose のマウント: `html:/usr/share/nginx/html`、`conf.d:/etc/nginx/conf.d:ro`、
  `/DATA/AppData/azuracast_program/output:/radio-output:ro` (放送内容 JSON 用)
- 公開は Cloudflare Tunnel のパス振り分け (このパスだけ 3104 へ、他は AzuraCast):
  `^/($|index\.html$|links\.json$|style/style\.css$|script/script\.js$|cast-background-1920x1080\.jpg$|favicon-cast-c-v4\.png$|default-album-art-v2\.png$|data/program_(12|15|18|21)_latest\.json$)`

## 運用メモ

- 番組表データ (script.js の SCHEDULE / PLANNED) は、ラジオ側リポジトリの
  `schedule/*.yaml` の実グリッドに合わせる。将来のテーマ番組は PLANNED 側に置き、
  放送が始まったら SCHEDULE へ移す
- style.css / script.js は7日キャッシュ対象。更新が反映されないときは
  Cloudflare で該当 URL をパージする
- 放送内容セクションは `/data/program_<枠>_latest.json` (生成側のサイドカー) を
  読む。JSON が無い枠ではセクションごと隠れる

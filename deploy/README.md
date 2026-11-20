# cast 自作トップページ — 配置メモ

決定: 2026-11-20、優が「新規フォルダ案で決める」と決定。
まだデプロイはしない。このフォルダは下書き置き場。

## ホスト側の配置（決定事項）

```text
/DATA/AppData/architectural-noise-cast/
  html/    … 公開ファイル
  conf.d/  … nginx 設定 (default.conf)
```

- Stack: nginx:alpine のみ (`docker-compose.yml` が下書き)
- コンテナ名: `architectural-noise_cast`（ブログの `architectural-noise_blog` と同型）
- ポート: 3104（本家 3100 / ブログ 3101 / Umami 予定 3102 / nekoOS 候補 3103 の続き）

`azuracast_program` 内には置かない。あちらは生成プログラムの Git リポジトリで、
公開ページと寿命・更新経路が違うため分離する。

## html/ に入れるもの

| 元ファイル (~/workspace/architectural-noise-cast/) | 配置先 |
|---|---|
| cast-top-draft-v2.html | html/index.html |
| cast-background-1920x1080.jpg | html/ (同名) |
| favicon-cast-c-v4.png | html/ (同名) |
| favicon.ico | html/ (同名) |
| default-album-art-v2.png | html/ (同名) |

## デプロイ時に残っている作業

1. ✅ 完了 (2026-11-20 優が実施): ホストで `/DATA/AppData/architectural-noise-cast/{html,conf.d}` を作り、上記を配置
2. ✅ 完了 (2026-11-20 優が実施): Portainer で Stack を登録し、`http://localhost:3104/` で表示確認
3. ✅ 完了 (2026-11-20): Cloudflare 側の振り分け。`cast.architectural-n.net` の下記パスだけをこの Stack (3104) へ、
   それ以外 (`/public`, `/listen`, `/api`, `/login` 等) は従来通り AzuraCast へ
   - 振り分けるパスは `/` だけではない。ページが相対参照する素材も含める:
     `/`, `/index.html`, `/cast-background-1920x1080.jpg`,
     `/favicon-cast-c-v4.png`, `/default-album-art-v2.png`
     (`/favicon.ico` は AzuraCast 側にも C-V4 が設定済みなので振り分け不要)
   - JS の API 取得と音声ストリームは cast ドメインへの絶対 URL なので影響なし
   - 方式は確定 (2026-11-20、優のスクリーンショットで確認): cast は Cloudflare Tunnel の
     公開アプリケーションで、サービスは `http://172.17.0.1:8080` (AzuraCast)。
     他の公開アプリと同じ Tunnel に相乗りしている
   - 進捗 (2026-11-20): Tunnel 入口の追加と並べ替えは完了し、外から検証済み。
     `/index.html` `/favicon-cast-c-v4.png` `/default-album-art-v2.png` は
     新 nginx (3104) から 200 で返る。`/cast-background-1920x1080.jpg` は
     当初配置漏れで 404、その後置かれたファイルは PNG (141,972 bytes、
     マジックバイト 89 50 4E 47) の拡張子だけを .jpg に変えたもので、
     本物の JPEG (88,801 bytes) への差し替えが必要と判明。
     差し替え後はオリジン (新 nginx) から本物 JPEG が返ることを
     キャッシュ避け URL で確認済み。ただし通常 URL は Cloudflare の
     エッジキャッシュに旧 PNG 版 (141,972 bytes) が残っており、
     その URL のキャッシュパージが必要 (素材に expires 7d を付けているため)。
     AzuraCast 側の `/public` `/login` `/api/nowplaying` `/listen` は全て 200 で無事。
     `/` はまだ Rewrite 経由で AzuraCast 公開ページのまま (想定通り)
     → その後、背景 URL のキャッシュパージ＋Rewrite 無効化まで完了し、
     最終確認で `/` が自作ページ、AzuraCast 側パスは全て 200 を確認して切り替え完了
   - 手順:
     1. Tunnel の Public Hostname に入口を1本追加: ホスト名は既存 cast と同じ
        `cast.architectural-n.net`、パス欄に下記の正規表現、サービスは
        `http://172.17.0.1:3104`
        ```
        ^/($|index\.html$|cast-background-1920x1080\.jpg$|favicon-cast-c-v4\.png$|default-album-art-v2\.png$)
        ```
     2. 追加した入口を、既存の cast 入口 (パス条件なし) の **直上** に並べ替える
        (ingress は上から評価され、最初に当たった入口が勝つ)
     3. 素材パスが新 nginx から返ることを外から確認
        (`/cast-background-1920x1080.jpg` が 200 で返れば入口は効いている。
        この時点では `/` はまだ Rewrite で公開ページのままなので壊れない)
     4. 既存の URL Rewrite (`/` → `/public/nerurus_room_rest`) を無効化する
        (Transform が先に効くとパスが変わって振り分け条件に当たらなくなるため)
     5. 外から確認: `/` が自作ページ、`/public/...` `/login` `/api/nowplaying/...`
        `/listen/...` が従来通り AzuraCast から返ること
   - AzuraCast の Homepage Redirect URL は保険として残す
     (振り分けが外れたら `/` が AzuraCast に届き、公開ページへ送られて戻せる)。
     ロールバックは Rewrite の再有効化＋追加した Tunnel 入口の削除で完了
4. ✅ 完了 (2026-11-20): nginx に CSP を追加（Google Fonts、cast 本体の API/ストリーム/アート、inline を許可）
   - `deploy/nginx.conf` の CSP をホスト conf.d へ差し替えて reload 済み。
     外から `Content-Security-Policy` ヘッダーが設計通りに返ることを確認し、
     優のブラウザでも表示・再生・Now Playing・フォントが正常で、
     DevTools の Network に失敗リクエストが無く Console も "No issues" で完了

## 全画面プレイヤー (v3)

- 2026-11-20 に優が「やっていこう」と決定し、`cast-top-draft-v3.html` に実装済み
  (JS 構文・ID 参照の検証済み)。プレイヤーバーのクリック (再生ボタン・音量・
  拡大ボタンは除外)、バーの ⛶ ボタン、Now Playing のアートのクリックで開く。
  閉じるのは ✕ か Esc。同じ `<audio>` を使うため開閉しても再生は途切れない
- 新しい外部オリジン・新規ファイルは無いため、CSP と Tunnel 振り分けは変更不要。
  デプロイはホストの `html/index.html` を v3 に差し替えるだけ
  (差し替え後の外からの確認が残り)

## v4 (3ファイル分割 + 放送内容セクション) — 2026-11-20 準備済み・未デプロイ

前提の訂正 (2026-11-20 夜、ホスト実績の tar で確認): ホストの index.html は
v3 と完全一致しており、v3 への差し替えは実施済みだった。ホストの
favicon-cast-c-v4.png は中身が WebP の最適化版 (94KB、拡張子は .png のまま)。
html/ には未参照の logo-architectural-noise.png と、空の style/・script/
フォルダーもある (ローカル Git の html/ に実績として取り込み済み)。
style/・script/ は分割ファイルの置き場所として優が用意したものと確認済みで、
v4 はその配置 (style/style.css、script/script.js) に合わせてある。

v3 を `v4/` フォルダの3ファイルに分割し、「放送内容」セクションを追加した版。
生成側は同日実装済み (ラジオ repo commit 8b2d581): ガジェット生成時に
`program_<枠>_latest.json` (話題3件 + ブログピックアップ) が MP3 の隣に出る。
ページは放送中/次の枠の JSON を `/data/` から取得して表示する
(鮮度ガード付き: 生成日時が枠開始 -70分〜+65分 のものだけ採用し、
生成失敗時に前日の内容を出さない)。

配置するもの:

| 元ファイル (`~/workspace/architectural-noise-cast/v4/`) | 配置先 |
|---|---|
| index.html | html/index.html (差し替え) |
| style/style.css | html/style/style.css (新規) |
| script/script.js | html/script/script.js (新規) |

デプロイ手順:

1. ラジオ側の git pull が済んでいること (サイドカー JSON の前提)
2. cast Stack の compose に `/radio-output` の読取専用マウントを追加
   (`deploy/docker-compose.yml` の v4 コメント参照) し、Pull and redeploy
3. `deploy/nginx.conf` の `/data/` location 入り版をホスト conf.d へ配置し reload
4. ホストで確認: 生成後に `curl http://localhost:3104/data/program_21_latest.json`
   が 200 (JSON がまだ無い時間帯は 404 が正しい)
5. Tunnel のパス正規表現を新版に差し替える (style/ / script/ / data を追加):
   ```
   ^/($|index\.html$|style/style\.css$|script/script\.js$|cast-background-1920x1080\.jpg$|favicon-cast-c-v4\.png$|default-album-art-v2\.png$|data/program_(12|15|18|21)_latest\.json$)
   ```
6. html/ に3ファイルを配置
7. 外から確認: `/` が v4 で表示される、`/style/style.css` `/script/script.js` が 200、
   放送時間帯 (または開始70分前から) に「いまの番組の内容 / 次の番組の内容」
   セクションが出ること

注意:
- style/style.css と script/script.js は静的素材ロケーションの対象で expires 7d +
  Cloudflare キャッシュに乗る。今後この2ファイルを更新するときは、
  背景画像のときと同じくキャッシュパージ (または版数付きファイル名) が必要
- 任意の締め付け: v4 で inline の style/script が消えたため、CSP の
  script-src / style-src から `'unsafe-inline'` を外せるようになった。
  効かせる場合は表示・再生・FX を確認しながら別途行うこと
- ブログトーク枠 (平日12時) のサイドカーは未実装。ページ側の表示処理は
  topics が無い JSON でも崩れない形にしてあるので、生成側を足せばそのまま出る

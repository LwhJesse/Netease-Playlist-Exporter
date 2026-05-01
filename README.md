# NetEase Playlist Exporter

> 网易云音乐歌单导出工具：保留原始顺序，导出 CSV / JSON / 迁移用 CSV / 纯文本，并支持扫码登录导出登录态可见歌曲。

A minimal NetEase Cloud Music playlist exporter. It preserves playlist order and supports logged-in export via QR login.

## 特性

- 导出网易云歌单为 `master.csv`
- 导出结构化 `master.json`
- 导出迁移用 `import.csv`
- 导出通用纯文本 `plain.txt`
- 保留原始歌单顺序，显式生成 `index` 列
- 保留网易云歌曲 ID、歌手 ID、专辑 ID
- 支持二维码登录，导出登录态可见歌曲
- 支持匿名导出，但会提示可能少歌
- 支持 `--expected-count` 检查导出数量是否和网页端一致

## 为什么需要登录态？

网易云的匿名 API 结果不一定等于网页端 / YesPlayMusic 登录态结果。

实际可能出现：

~~~text
官方网页 / YesPlayMusic 登录态：801 首
匿名 API：800 首
~~~

原因可能包括：

- 登录态可见歌曲
- 历史版权条目
- 地区 / 版权限制
- 官方网页端与第三方 API 返回不一致
- 私有歌单或账号相关可见性差异

所以如果你要做完整归档，推荐先登录：

~~~bash
node ./bin/netease-playlist-export.mjs login
~~~

然后导出时加上你在网页端看到的数量：

~~~bash
node ./bin/netease-playlist-export.mjs export \
  'https://music.163.com/#/playlist?id=123456789' \
  --expected-count 801
~~~

如果数量不一致，工具会警告。

## 安装依赖

本工具需要 Node.js 18+。

你还需要一个兼容的网易云 API 服务。推荐先使用：

~~~bash
npm run start-api
~~~

这会启动：

~~~text
http://localhost:3000
~~~

本项目本身不下载音乐文件，只导出歌单元数据。

## 使用方法

### 1. 启动 API 服务

开一个终端：

~~~bash
npm run start-api
~~~

不要关闭这个终端。

### 2. 扫码登录

另开一个终端：

~~~bash
node ./bin/netease-playlist-export.mjs login
~~~

工具会生成：

~~~text
.state/login-qr.png
~~~

并尝试自动打开二维码图片。用网易云音乐 App 扫码登录。

登录成功后，cookie 会保存到：

~~~text
.state/cookie.txt
~~~

`.state/` 不会被 Git 跟踪。

### 3. 导出歌单

~~~bash
node ./bin/netease-playlist-export.mjs export \
  'https://music.163.com/#/playlist?id=123456789'
~~~

带数量校验：

~~~bash
node ./bin/netease-playlist-export.mjs export \
  'https://music.163.com/#/playlist?id=123456789' \
  --expected-count 801
~~~

匿名导出：

~~~bash
node ./bin/netease-playlist-export.mjs export 123456789 --anonymous
~~~

手动传入 cookie：

~~~bash
node ./bin/netease-playlist-export.mjs export \
  123456789 \
  --cookie 'MUSIC_U=你的值;'
~~~

## 输出文件

导出结果在：

~~~text
out/
~~~

包括：

~~~text
<playlist>.master.csv
<playlist>.master.json
<playlist>.import.csv
<playlist>.plain.txt
~~~

### `master.csv`

档案级主文件，字段包括：

~~~text
index
playlist_id
playlist_name
netease_song_id
song_name
artist_names
artist_ids
album_name
album_id
duration_ms
aliases
source_url
status
~~~

### `master.json`

完整结构化备份，适合后续程序处理。

### `import.csv`

迁移到其他音乐服务时使用，字段更简单：

~~~text
index,title,artist,album
~~~

### `plain.txt`

最通用格式：

~~~text
歌名 - 歌手
~~~

## 准确性说明

本工具保证：

- 对 API 返回的 `trackIds` 保持原始顺序
- 用 `song.id` 回填歌曲详情，避免批量接口顺序变化导致错位
- 对 API 返回的歌曲不静默丢弃
- 显式输出 `index`

本工具不能保证：

- 第三方网易云 API 永远与官方网页端完全一致
- 匿名态结果等于登录态结果
- 所有下架、灰色、地区限制、历史版权歌曲都能匿名返回

如果你要做长期归档，请始终检查：

~~~text
网页端显示数量 == exportedCount
~~~

推荐使用：

~~~bash
--expected-count <网页端歌曲数>
~~~

## 项目状态

v0.1：最小可用 CLI。

当前目标：

- 稳定导出网易云歌单元数据
- 保留顺序
- 支持登录态
- 明确提示少歌风险

后续可能计划：

- 图形界面
- 更强的网页端校验
- 对 YesPlayMusic 增加导出按钮
- C++ 版本

## 安全提醒

`MUSIC_U` 是登录凭证。

不要把下面这些文件提交到 Git：

~~~text
.state/cookie.txt
.state/login-qr.png
~~~

本项目默认已在 `.gitignore` 中忽略 `.state/`。

## License

MIT

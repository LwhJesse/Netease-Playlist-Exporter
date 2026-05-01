# NetEase Playlist Exporter

> 网易云音乐歌单元数据导出工具。  
> 保留歌单原始顺序，导出 CSV / JSON / 迁移用 CSV / 纯文本，并支持二维码登录导出登录态可见歌曲。

A minimal NetEase Cloud Music playlist metadata exporter.  
It preserves playlist order and supports logged-in export via QR login.

---

## 这是什么？

这是一个命令行工具，用来把网易云音乐歌单导出成外部文件，方便个人备份、整理和迁移。

它导出的不是音乐文件，而是歌单元数据，例如：

- 歌曲序号
- 网易云歌曲 ID
- 歌名
- 歌手
- 歌手 ID
- 专辑
- 专辑 ID
- 时长
- 歌曲链接

---

## 它不做什么？

本项目不提供以下功能：

- 不下载音乐音频
- 不破解会员歌曲
- 不解密音频文件
- 不绕过付费或版权限制
- 不提供任何音乐文件
- 不提供解锁灰色歌曲功能

本项目只导出用户可访问的歌单元数据。

---

## 功能

- 导出网易云歌单为 `master.csv`
- 导出完整结构化 `master.json`
- 导出迁移用 `import.csv`
- 导出通用纯文本 `plain.txt`
- 保留歌单原始顺序，显式生成 `index` 列
- 支持二维码登录
- 支持登录态导出
- 支持匿名导出
- 支持 `--expected-count` 检查导出数量是否和网页端一致

---
## 跨平台说明

本项目核心逻辑基于 Node.js 18+，理论上支持 Linux、macOS 和 Windows。

状态文件和导出文件都保存在项目目录内：

```text
.state/
out/
```

不会写入 `~/.config` 或系统级目录。

二维码登录会尝试自动打开 `.state/login-qr.png`：

- Linux: `xdg-open`
- macOS: `open`
- Windows: `cmd /c start`

如果自动打开失败，请手动打开 `.state/login-qr.png`。

Windows PowerShell 示例：

```powershell
node .\bin\netease-playlist-export.mjs login

node .\bin\netease-playlist-export.mjs export "https://music.163.com/#/playlist?id=123456789" --expected-count 801
```
---

## 快速开始

### 1. 启动网易云 API 服务

开一个终端：

```bash
npm run start-api
```

不要关闭这个终端。

默认 API 地址是：

```text
http://localhost:3000
```

### 2. 扫码登录

另开一个终端：

```bash
node ./bin/netease-playlist-export.mjs login
```

工具会生成二维码图片：

```text
.state/login-qr.png
```

它会尝试自动打开图片。  
如果没有自动打开，请手动打开 `.state/login-qr.png`，然后用网易云音乐 App 扫码登录。

登录成功后，登录态会保存到：

```text
.state/cookie.txt
```

`.state/` 已经被 `.gitignore` 忽略，不会提交到 Git。

### 3. 导出歌单

```bash
node ./bin/netease-playlist-export.mjs export \
  'https://music.163.com/#/playlist?id=123456789'
```

也可以直接传歌单 ID：

```bash
node ./bin/netease-playlist-export.mjs export 123456789
```

### 4. 带数量校验导出

推荐使用 `--expected-count`，把网页端显示的歌曲数填进去：

```bash
node ./bin/netease-playlist-export.mjs export \
  'https://music.163.com/#/playlist?id=123456789' \
  --expected-count 801
```

如果导出的数量和你给出的数量不一致，工具会输出警告。

### 5. 匿名导出

如果你不想登录，也可以匿名导出：

```bash
node ./bin/netease-playlist-export.mjs export 123456789 --anonymous
```

注意：匿名导出可能少歌。

### 6. 手动传入 cookie

如果你已经有 `MUSIC_U`，也可以手动传入：

```bash
node ./bin/netease-playlist-export.mjs export \
  123456789 \
  --cookie 'MUSIC_U=你的值;'
```

不要把 `MUSIC_U` 发给别人。它是登录凭证。

---

## 输出文件

导出结果会写到：

```text
out/
```

包括：

```text
<playlist>.master.csv
<playlist>.master.json
<playlist>.import.csv
<playlist>.plain.txt
```

---

## 输出格式说明

### `master.csv`

主档案文件，适合长期保存。

字段包括：

```text
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
```

其中 `index` 是歌单中的原始顺序。

### `master.json`

完整结构化备份，适合后续程序处理。

### `import.csv`

迁移到其他音乐服务时使用的简化表格：

```text
index,title,artist,album
```

### `plain.txt`

最通用的纯文本格式：

```text
歌名 - 歌手
```

---

## 为什么需要登录？

网易云匿名 API 返回的歌单内容，不一定和你在官方网页端或 YesPlayMusic 登录态下看到的内容完全一致。

例如可能出现：

```text
官方网页 / YesPlayMusic 登录态：801 首
匿名 API：800 首
```

这种情况通常不是导出器漏写文件，而是匿名态 API 本身没有返回某些登录态可见歌曲。

可能原因包括：

- 登录态可见歌曲
- 私有或账号相关可见性
- 历史版权条目
- 地区或版权限制
- 官方网页端和第三方 API 返回不一致
- API 服务匿名 token 和用户真实登录态不同

如果你要做完整归档，建议先登录再导出。

---

## 准确性说明

本项目保证：

- 对 API 返回的 `trackIds` 保持原始顺序
- 用 `song.id` 回填歌曲详情
- 避免批量接口返回顺序变化导致歌曲错位
- 对 API 返回的歌曲不静默丢弃
- 显式输出 `index`
- 支持通过 `--expected-count` 检查数量异常

本项目不能保证：

- 第三方网易云 API 永远与官方网页端完全一致
- 匿名态结果等于登录态结果
- 所有下架、灰色、地区限制、历史版权歌曲都能匿名返回
- API 服务长期稳定可用

如果你要做长期归档，请始终核对：

```text
网页端显示数量 == 导出数量
```

推荐使用：

```bash
--expected-count <网页端显示的歌曲数>
```

---

## 与 YesPlayMusic 的关系

本项目的实现思路参考了 YesPlayMusic 的歌单加载与登录态处理方式，包括：

- 通过二维码登录获取 `MUSIC_U`
- 请求网易云 API 时通过 `cookie` 参数传递登录态
- 使用 `/playlist/detail` 获取歌单的 `trackIds`
- 使用 `/song/detail` 批量补全歌曲详情

本项目不是 YesPlayMusic 的官方项目，也不隶属于 YesPlayMusic。

本项目没有直接复制 YesPlayMusic 的源码文件，而是参考其公开实现思路重新实现了一个独立的歌单导出 CLI。

---

## 安全提醒

`MUSIC_U` 是登录凭证。

不要提交或公开以下文件：

```text
.state/cookie.txt
.state/login-qr.png
```

本项目默认已经在 `.gitignore` 中忽略 `.state/`。

---

## 免责声明

本项目仅用于导出用户本人可访问的网易云音乐歌单元数据，便于个人备份、整理和迁移。

本项目不提供音乐下载功能，不破解、不解密、不绕过付费或版权限制，也不提供任何音频文件。

本项目不是网易云音乐官方项目，也不隶属于网易、网易云音乐或 YesPlayMusic。

本项目依赖第三方网易云 API 服务。由于登录态、版权状态、地区限制、接口变化或平台策略不同，导出结果可能与官方网页端显示不完全一致。使用者应自行核对导出数量与内容。

使用本项目时，请遵守网易云音乐用户协议以及所在地法律法规。因使用本项目产生的账号风险、接口限制、数据缺失或其他后果，由使用者自行承担。

如果权利方认为本项目存在不当内容，请通过 issue 联系，我会尽快处理。

---

## 项目状态

当前版本：v0.1

当前目标：

- 稳定导出网易云歌单元数据
- 保留原始顺序
- 支持登录态导出
- 明确提示匿名态可能少歌
- 保持 CLI 简单、可审计

后续可能计划：

- 图形界面
- 更强的网页端校验
- 更完善的错误提示
- 对 YesPlayMusic 增加导出按钮
- 对接别的音乐平台API

---

## License

MIT

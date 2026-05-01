# Contributing

欢迎提交 issue 和 PR。

当前项目目标是保持工具简单、可靠、可审计。

优先级：

1. 导出准确性
2. 登录态兼容
3. 顺序保留
4. 输出格式稳定
5. 简洁 CLI

暂不优先：

- 音乐下载
- 复杂播放器功能
- 大型 GUI
- 账号凭证托管服务

提交 PR 前请确保：

~~~bash
node ./bin/netease-playlist-export.mjs --help
~~~

可以正常运行。

# bingwu

读取 GitHub 上统一维护的仓库模板和 npm 脚手架配置，快速创建项目。

需要 Node.js 22.18+ 或 24.x，以及 pnpm 11.15.1。

## 使用

```bash
pnpm add --global bingwu-cli
bingwu
```

也可以通过 `pnpm dlx bingwu-cli` 直接运行。包名为 `bingwu-cli`，命令名为 `bingwu`。

模板由 [bingwu-devkit/bingwu-workspace 的 templates.json](https://github.com/bingwu-devkit/bingwu-workspace/blob/main/templates.json) 统一维护。列表和创建命令每次读取 `main` 分支的配置，当前包含 Electron Vite、Shadcn Admin、Shadcn Vue Admin 和 TypeScript Library Starter：

```bash
bingwu list
bingwu create my-electron -t electron-vite
bingwu create my-admin -t shadcn-admin
bingwu create my-vue-admin -t shadcn-vue-admin
bingwu create my-library -t starter-ts
bingwu create my-admin -t shadcn-admin --install
```

无参数时交互选择模板与项目目录。目标目录必须不存在或为空；取消交互返回退出码 130。

GitHub 模板创建后可以选择是否运行 `pnpm install`。第三方脚手架保留自己的交互流程，`--` 后的参数会透传给脚手架：

```bash
bingwu create my-app -t electron-vite -- --template vue-ts
```

## 维护模板

新增、修改或删除模板时，编辑仓库根目录的 `templates.json` 并推送到 `main`。只修改模板列表无需重新发布 CLI，GitHub CDN 缓存可能让修改延迟几分钟生效。配置由 Zod 校验，CLI 模板的 `args` 支持 `{projectDir}` 占位符。

列表和创建命令需要能访问 `raw.githubusercontent.com`，请求超时为 15 秒。网络、HTTP 或配置错误会明确报错；`--help` 和 `--version` 无需联网。

新版不再读取或写入旧的本地收藏配置，`add`、`remove`、`config` 命令及 `--config` 选项已移除。

## 模块入口

导出异步 `loadTemplates()` 获取与 CLI 相同的远程列表；`builtinTemplates` 为发布时的配置快照。另导出 `Template`、`GithubTemplate`、`CliTemplate`、`TemplateConfig` 类型。导入模块不会运行 CLI 或发起网络请求。

```ts
import { loadTemplates } from 'bingwu-cli'

const templates = await loadTemplates()
```

完整用法见[项目文档](https://github.com/bingwu-devkit/bingwu-workspace#readme)。

## 许可证

[MIT](https://github.com/bingwu-devkit/bingwu-workspace/blob/main/LICENSE.md)

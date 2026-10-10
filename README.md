# bingwu CLI

个人项目创建 CLI：从 GitHub 上统一维护的模板配置读取仓库模板和第三方 npm 脚手架，通过一个命令快速创建项目。

## 安装与使用

需要 Node.js 22.18+ 或 24.x，以及 pnpm 11.15.1。

```bash
pnpm add --global bingwu-cli
bingwu
```

也可以不全局安装，直接运行 `pnpm dlx bingwu-cli`。npm 包名为 `bingwu-cli`，命令名为 `bingwu`。

## 本地开发

需要 Node.js 22.18+ 或 24.x，以及 pnpm 11.15.1。

```bash
pnpm install
pnpm bingwu
```

`pnpm bingwu` 自动构建 Core 后，从当前工作目录运行 CLI 源码。也可以构建后直接执行：

```bash
pnpm build
node packages/cli/dist/cli.mjs list
```

要在其他目录直接使用 `bingwu`，构建后创建全局链接：

```bash
pnpm --dir packages/cli link --global
bingwu list
```

## 模板列表

模板统一维护在本仓库 `main` 分支根目录的 [templates.json](./templates.json)。`bingwu list`、`bingwu create` 和无参数交互每次都会读取远程配置，以下为当前模板：

| ID                 | 类型       | 来源                                         |
| ------------------ | ---------- | -------------------------------------------- |
| `electron-vite`    | npm 脚手架 | `@quick-start/create-electron@latest`        |
| `shadcn-admin`     | GitHub     | `satnaing/shadcn-admin` 的 `main` 分支       |
| `shadcn-vue-admin` | GitHub     | `Whbbit1999/shadcn-vue-admin` 的 `main` 分支 |
| `starter-ts`       | GitHub     | `bingwu-devkit/starter-ts` 的 `main` 分支    |

Electron 模板运行 `pnpm dlx @quick-start/create-electron@latest <项目目录>`，保留官方的框架、TypeScript、更新插件和下载镜像选择。[官方指南](https://cn.electron-vite.org/guide/)

Shadcn Admin 下载仓库源码作为项目起点，保留完整界面、原始包名、许可证和其他文件，不携带 Git 历史。[原始仓库](https://github.com/satnaing/shadcn-admin)

Shadcn Vue Admin 提供 Vue 3 管理面板，[原始仓库](https://github.com/Whbbit1999/shadcn-vue-admin)。TypeScript Library Starter 提供 TypeScript 库项目起点，[原始仓库](https://github.com/bingwu-devkit/starter-ts)。两者同样下载完整仓库源码，不携带 Git 历史。

## 创建项目

```bash
bingwu                                      # 交互选择模板和输入目录
bingwu create my-app                         # 交互选择模板
bingwu create my-app -t electron-vite
bingwu create my-admin -t shadcn-admin
bingwu create my-vue-admin -t shadcn-vue-admin
bingwu create my-library -t starter-ts
bingwu create my-app -t electron-vite -- --template vue-ts
bingwu create my-admin -t shadcn-admin --install
bingwu create my-admin -t shadcn-admin --no-install
```

项目目录相对于运行命令时的工作目录解析，支持嵌套目录和绝对路径。目标只能是不存在的目录或空目录；文件、符号链接和非空目录会被拒绝，没有强制覆盖选项。

GitHub 模板下载完成后，交互模式会询问是否运行 `pnpm install`，默认不安装。`--install` 明确安装，`--no-install` 跳过询问；非交互模式默认不安装。安装失败时保留已创建的项目文件。

第三方 CLI 继承终端输入输出，在目标父目录运行。`--` 后的参数追加到模板配置的默认参数之后；安装选项只用于 GitHub 模板，第三方脚手架保留自身流程。

非交互终端必须提供项目目录和 `--template`；第三方脚手架是否还需要交互由其自身决定。取消 bingwu 的交互返回退出码 130；脚手架失败时传递其退出码。不会自动启动开发服务或初始化 Git。

## 维护模板配置

新增、修改或删除模板时，编辑仓库根目录的 `templates.json` 并推送到 `main`。只修改模板列表无需重新发布 CLI，所有使用新版 CLI 的用户都会读取 GitHub 上的配置。GitHub 的 CDN 缓存可能让刚提交的修改延迟几分钟生效。

```bash
bingwu list
```

配置格式如下，Zod 会校验版本、模板字段及重复 ID：

```json
{
  "version": 1,
  "templates": [
    {
      "id": "electron-vite",
      "name": "Electron Vite（官方交互）",
      "type": "cli",
      "package": "@quick-start/create-electron@latest",
      "args": ["{projectDir}"]
    },
    {
      "id": "shadcn-admin",
      "name": "Shadcn Admin",
      "type": "github",
      "repo": "satnaing/shadcn-admin",
      "ref": "main"
    },
    {
      "id": "shadcn-vue-admin",
      "name": "Shadcn Vue Admin",
      "type": "github",
      "repo": "Whbbit1999/shadcn-vue-admin",
      "ref": "main"
    },
    {
      "id": "starter-ts",
      "name": "TypeScript Library Starter",
      "type": "github",
      "repo": "bingwu-devkit/starter-ts",
      "ref": "main"
    }
  ]
}
```

GitHub 模板的 `repo` 支持 `owner/repo` 或 GitHub 仓库地址；`ref`、`subdir` 可选，省略 `ref` 时使用下载工具的默认 ref。CLI 模板通过 `package` 和 `args` 配置脚手架；包名未指定版本时使用 `latest`，创建时将 `args` 中的 `{projectDir}` 替换成目标目录名称，各参数保持独立。

列表和创建命令需要能访问 `raw.githubusercontent.com`。请求超时为 15 秒，网络、HTTP 或配置错误会明确报错。`--help` 和 `--version` 无需联网。

新版不再读取或写入旧的本地收藏配置，`add`、`remove`、`config` 命令及 `--config` 选项已移除。

## 开发与验证

```bash
pnpm bingwu --help
pnpm build
pnpm check
pnpm --filter @bingwu/example-basic start
```

仓库按职责拆分为两个可发布包：

```text
packages/
├── cli/   # bingwu-cli：命令行入口、参数解析和终端交互
└── core/  # bingwu-core：模板读取、配置校验和项目创建 API
```

`bingwu-cli` 通过 `workspace:^` 依赖 `bingwu-core`，Turborepo 按依赖顺序构建和检查。两个包均由 tsdown 构建 ESM，Vitest 分别验证 Core 的远程配置、模板校验与目录保护，以及 CLI 的参数、交互和构建后的命令。自动测试使用模拟 Fetch、临时目录及替身 pnpm，不依赖外部网络。修改 `templates.json` 后运行 `pnpm check` 可校验配置。

[`bingwu-core`](./packages/core/README.md) 导出异步 `loadTemplates()`，读取与 CLI 相同的远程列表；`builtinTemplates` 保留为发布时 `templates.json` 的配置快照，基本示例直接依赖 Core 并使用这个快照以便离线运行。另提供 `parseConfig()`、`parseTemplate()`、`createProject()`、`installDependencies()` 等 API 及相关类型。导入模块不会执行 CLI 或发起网络请求。[`bingwu-cli`](./packages/cli/README.md) 继续转导出原有的模板读取 API 和类型，兼容已有程序调用。

沿用 pnpm workspace、Turborepo、Oxlint、Oxfmt 和 Changesets。CI 覆盖 Windows / Ubuntu 与 Node.js 22 / 24。

统一使用 pnpm，支持公开 GitHub 仓库和 npm 脚手架模板。

## 发布

首次发布在本地完成 npm 登录，使用 Changesets 生成版本后检查、提交并发布：

```bash
pnpm login --registry=https://registry.npmjs.org
pnpm version-packages
pnpm format
pnpm check
git add .
git commit -m "chore: 发布新版本"
pnpm -r --filter './packages/*' publish --publish-branch main --access public --no-provenance
```

`--no-provenance` 用于本地首发；GitHub Actions 发布保留来源证明。pnpm 按依赖顺序先发布 Core 再发布 CLI，并将 `catalog:` 和 `workspace:^` 依赖转换为实际版本范围。

每个包首发成功后，分别在 `bingwu-core` 和 `bingwu-cli` 的 npm 包设置中添加 GitHub Actions Trusted Publisher：Organization / User 为 `bingwu-devkit`、Repository 为 `bingwu-cli`、Workflow filename 为 `release.yml`，Environment 留空，并允许直接发布。仓库重命名后，已配置的 Trusted Publisher 也需要将 Repository 更新为 `bingwu-cli`。GitHub 仓库的 Actions 设置需要允许工作流创建 PR。

后续运行 `pnpm changeset` 记录变更并提交到 `main`；Release 工作流创建版本 PR，合并该 PR 后自动发布 npm 包并创建 GitHub Release。

## 许可证

[MIT](./LICENSE.md)

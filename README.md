# bingwu CLI

个人项目创建 CLI：从 GitHub 上统一维护的模板配置读取仓库模板和第三方 npm 脚手架，通过一个命令快速创建项目。

## 安装与使用

需要 Node.js 22.18+ 或 24.x，以及 pnpm。

直接运行：

```bash
npx --yes bingwu-cli@latest
```

也可以全局安装：

```bash
pnpm add -g bingwu-cli@latest
```

使用全局安装的 `bingwu` 命令：

```bash
bingwu
```

npm 包名为 `bingwu-cli`，命令名为 `bingwu`。

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

| ID                                | 类型       | GitHub 仓库                                                                                               |
| --------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `electron-vite`                   | npm 脚手架 | [alex8088/electron-vite](https://github.com/alex8088/electron-vite)                                       |
| `electron-forge`                  | npm 脚手架 | [electron/forge](https://github.com/electron/forge)                                                       |
| `fumadocs`                        | npm 脚手架 | [fuma-nama/fumadocs](https://github.com/fuma-nama/fumadocs)                                               |
| `unibest`                         | npm 脚手架 | [feige996/unibest](https://github.com/feige996/unibest)                                                   |
| `shadcn-react-template`           | GitHub     | [bingwu-templates/shadcn-react-template](https://github.com/bingwu-templates/shadcn-react-template)       |
| `shadcn-vue-admin`                | GitHub     | [Whbbit1999/shadcn-vue-admin](https://github.com/Whbbit1999/shadcn-vue-admin)                             |
| `pure-admin-thin`                 | GitHub     | [bingwu-templates/pure-admin-thin](https://github.com/bingwu-templates/pure-admin-thin)                   |
| `art-design-pro-thin`             | GitHub     | [bingwu-templates/art-design-pro-thin](https://github.com/bingwu-templates/art-design-pro-thin)           |
| `tanstack-shadcn-admin-dashboard` | GitHub     | [arhamkhnz/tanstack-shadcn-admin-dashboard](https://github.com/arhamkhnz/tanstack-shadcn-admin-dashboard) |
| `next-shadcn-admin-dashboard`     | GitHub     | [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)         |
| `next-shadcn-dashboard-starter`   | GitHub     | [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)       |
| `tanstack-start-dashboard`        | GitHub     | [Kiranism/tanstack-start-dashboard](https://github.com/Kiranism/tanstack-start-dashboard)                 |
| `shadcn-admin`                    | GitHub     | [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)                                         |
| `starter-ts`                      | GitHub     | [bingwu-templates/starter-ts](https://github.com/bingwu-templates/starter-ts)                             |

Electron Vite 模板运行 `pnpm dlx @quick-start/create-electron@latest <项目目录>`，保留官方的框架、TypeScript、更新插件和下载镜像选择。仓库：[alex8088/electron-vite](https://github.com/alex8088/electron-vite)。

Electron Forge 模板运行 `pnpm dlx create-electron-app@latest <项目目录>`，保留官方的包管理器、构建工具、语言和 Electron 版本等交互选择。可以通过 `--` 透传 `--template`、`--typescript`、`--package-manager` 等官方参数；传入选项时，脚手架按官方规则处理交互和默认值。依赖安装及 Git 初始化由官方脚手架处理。使用 pnpm 时，按官方要求在生成项目的 `.npmrc` 中设置 `node-linker=hoisted`。仓库：[electron/forge](https://github.com/electron/forge)。

Fumadocs 模板运行 `pnpm dlx create-fumadocs-app@latest <项目目录>`，保留官方的模板和功能配置选择，用于创建文档站点。仓库：[fuma-nama/fumadocs](https://github.com/fuma-nama/fumadocs)。

unibest 模板运行 `pnpm dlx create-unibest@latest <项目目录>`，保留官方的平台、UI 库、登录策略和多语言等配置选择，用于创建 uni-app 项目。仓库：[feige996/unibest](https://github.com/feige996/unibest)。

Shadcn React Template 下载 [bingwu-templates/shadcn-react-template](https://github.com/bingwu-templates/shadcn-react-template) 的完整仓库源码作为项目起点，保留原始包名、许可证和其他文件，不携带 Git 历史。

Shadcn Vue Admin 提供 Vue 3 管理面板，[原始仓库](https://github.com/Whbbit1999/shadcn-vue-admin)。TypeScript Library Starter 提供 TypeScript 库项目起点，[模板仓库](https://github.com/bingwu-templates/starter-ts)。两者同样下载完整仓库源码，不携带 Git 历史。

Pure Admin Thin 下载 [bingwu-templates/pure-admin-thin](https://github.com/bingwu-templates/pure-admin-thin) 的完整仓库源码作为项目起点，不携带 Git 历史。

Art Design Pro Thin 下载 [bingwu-templates/art-design-pro-thin](https://github.com/bingwu-templates/art-design-pro-thin) 的完整仓库源码作为项目起点，不携带 Git 历史。

TanStack Shadcn Admin Dashboard 和 Next Shadcn Admin Dashboard 分别提供 TanStack Start、Next.js 管理面板，来源为 [arhamkhnz/tanstack-shadcn-admin-dashboard](https://github.com/arhamkhnz/tanstack-shadcn-admin-dashboard) 和 [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)。Next Shadcn Dashboard Starter 和 TanStack Start Dashboard 来源为 [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) 和 [Kiranism/tanstack-start-dashboard](https://github.com/Kiranism/tanstack-start-dashboard)。这四个模板均下载 `main` 分支的完整仓库源码，不携带 Git 历史。

Shadcn Admin 提供基于 Shadcn 和 Vite 的管理面板，下载 [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) 的 `main` 分支完整仓库源码，不携带 Git 历史。

## 创建项目

```bash
bingwu                                      # 交互选择模板和输入目录
bingwu create my-app                         # 交互选择模板
bingwu create my-app -t electron-vite
bingwu create my-forge-app -t electron-forge
bingwu create my-docs -t fumadocs
bingwu create my-uniapp -t unibest
bingwu create my-admin -t shadcn-react-template
bingwu create my-vue-admin -t shadcn-vue-admin
bingwu create my-pure-admin -t pure-admin-thin
bingwu create my-art-admin -t art-design-pro-thin
bingwu create my-tanstack-admin -t tanstack-shadcn-admin-dashboard
bingwu create my-next-admin -t next-shadcn-admin-dashboard
bingwu create my-next-dashboard -t next-shadcn-dashboard-starter
bingwu create my-tanstack-dashboard -t tanstack-start-dashboard
bingwu create my-shadcn-admin -t shadcn-admin
bingwu create my-library -t starter-ts
bingwu create my-app -t electron-vite -- --template vue-ts
bingwu create my-forge-app -t electron-forge -- --template=vite --typescript --package-manager=pnpm
bingwu create my-admin -t shadcn-react-template --install
bingwu create my-admin -t shadcn-react-template --no-install
```

项目目录相对于运行命令时的工作目录解析，支持嵌套目录和绝对路径。目标只能是不存在的目录或空目录；文件、符号链接和非空目录会被拒绝，没有强制覆盖选项。

交互选择模板时，当前高亮项旁会显示完整的 GitHub 仓库地址，方向键切换模板时地址随之更新。所有仓库地址统一维护在 `templates.json` 的 `repo` 字段中，官方交互脚手架也使用同一字段；CLI 不按包名推断地址。未配置 `repo` 的旧脚手架模板保留“ID · 类型”提示。

GitHub 模板下载完成后，交互模式会询问是否运行 `pnpm install`，默认不安装。`--install` 明确安装，`--no-install` 跳过询问；非交互模式默认不安装。安装失败时保留已创建的项目文件。

第三方 CLI 继承终端输入输出，在目标父目录运行。`--` 后的参数追加到模板配置的默认参数之后；安装选项只用于 GitHub 模板，第三方脚手架保留自身流程。

非交互终端必须提供项目目录和 `--template`；第三方脚手架是否还需要交互由其自身决定。取消 bingwu 的交互返回退出码 130；脚手架失败时传递其退出码。bingwu 本身不会自动启动开发服务或初始化 Git，第三方脚手架保留自身流程。

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
      "repo": "https://github.com/alex8088/electron-vite",
      "args": ["{projectDir}"]
    },
    {
      "id": "electron-forge",
      "name": "Electron Forge（官方交互）",
      "type": "cli",
      "package": "create-electron-app@latest",
      "repo": "https://github.com/electron/forge",
      "args": ["{projectDir}"]
    },
    {
      "id": "fumadocs",
      "name": "Fumadocs（官方交互）",
      "type": "cli",
      "package": "create-fumadocs-app@latest",
      "repo": "https://github.com/fuma-nama/fumadocs",
      "args": ["{projectDir}"]
    },
    {
      "id": "unibest",
      "name": "unibest（官方交互）",
      "type": "cli",
      "package": "create-unibest@latest",
      "repo": "https://github.com/feige996/unibest",
      "args": ["{projectDir}"]
    },
    {
      "id": "shadcn-react-template",
      "name": "Shadcn React Template",
      "type": "github",
      "repo": "https://github.com/bingwu-templates/shadcn-react-template",
      "ref": "main"
    },
    {
      "id": "shadcn-vue-admin",
      "name": "Shadcn Vue Admin",
      "type": "github",
      "repo": "https://github.com/Whbbit1999/shadcn-vue-admin",
      "ref": "main"
    },
    {
      "id": "pure-admin-thin",
      "name": "Pure Admin Thin",
      "type": "github",
      "repo": "https://github.com/bingwu-templates/pure-admin-thin",
      "ref": "main"
    },
    {
      "id": "art-design-pro-thin",
      "name": "Art Design Pro Thin",
      "type": "github",
      "repo": "https://github.com/bingwu-templates/art-design-pro-thin",
      "ref": "main"
    },
    {
      "id": "tanstack-shadcn-admin-dashboard",
      "name": "TanStack Shadcn Admin Dashboard",
      "type": "github",
      "repo": "https://github.com/arhamkhnz/tanstack-shadcn-admin-dashboard",
      "ref": "main"
    },
    {
      "id": "next-shadcn-admin-dashboard",
      "name": "Next Shadcn Admin Dashboard",
      "type": "github",
      "repo": "https://github.com/arhamkhnz/next-shadcn-admin-dashboard",
      "ref": "main"
    },
    {
      "id": "next-shadcn-dashboard-starter",
      "name": "Next Shadcn Dashboard Starter",
      "type": "github",
      "repo": "https://github.com/Kiranism/next-shadcn-dashboard-starter",
      "ref": "main"
    },
    {
      "id": "tanstack-start-dashboard",
      "name": "TanStack Start Dashboard",
      "type": "github",
      "repo": "https://github.com/Kiranism/tanstack-start-dashboard",
      "ref": "main"
    },
    {
      "id": "shadcn-admin",
      "name": "Shadcn Admin",
      "type": "github",
      "repo": "https://github.com/satnaing/shadcn-admin",
      "ref": "main"
    },
    {
      "id": "starter-ts",
      "name": "TypeScript Library Starter",
      "type": "github",
      "repo": "https://github.com/bingwu-templates/starter-ts",
      "ref": "main"
    }
  ]
}
```

所有模板的 `repo` 统一填写完整 GitHub 仓库地址，例如 `https://github.com/alex8088/electron-vite`，同时兼容旧的 `owner/repo` 写法。解析时会规范化仓库地址，交互界面显示完整链接，下载逻辑保持兼容。GitHub 模板的 `ref`、`subdir` 可选，省略 `ref` 时使用下载工具的默认 ref。CLI 模板通过 `package` 和 `args` 配置脚手架；包名未指定版本时使用 `latest`，创建时将 `args` 中的 `{projectDir}` 替换成目标目录名称，各参数保持独立。CLI 模板的 `repo` 可选，仅用于交互展示，不影响 npm 包来源、执行参数或 `bingwu list` 输出。配置版本保持 `1`，旧配置无需补充 `repo`。

交互界面显示 GitHub 地址需要使用支持此功能的 CLI 新版本；发布后，仓库地址仍随远程模板配置更新。

列表和创建命令需要能访问 `raw.githubusercontent.com`。请求超时为 15 秒，网络、HTTP 或配置错误会明确报错。`--help` 和 `--version` 无需联网。

新版不再读取或写入旧的本地收藏配置，`add`、`remove`、`config` 命令及 `--config` 选项已移除。

## 开发与验证

```bash
pnpm bingwu --help
pnpm build
pnpm check
pnpm --filter @bingwu/example-basic start
```

仓库按职责拆分为 CLI 包和内部 Core 包：

```text
packages/
├── cli/   # bingwu-cli：命令行入口、参数解析和终端交互
└── core/  # @bingwu/core：私有工作区包，模板读取、校验和项目创建
```

`bingwu-cli` 通过开发依赖 `workspace:*` 使用 `@bingwu/core`，Turborepo 按依赖顺序构建和检查。CLI 构建时将 Core 的实现与类型声明一并打包，发布后的运行时依赖不包含 `@bingwu/core`。Core 设置为 `private: true`，Changesets 跳过其版本管理、打标签和发布。

两个包均由 tsdown 构建 ESM，Vitest 分别验证 Core 的远程配置、模板校验与目录保护，以及 CLI 的参数、交互和构建后的命令。自动测试使用模拟 Fetch、临时目录及替身 pnpm，不依赖外部网络。修改 `templates.json` 后运行 `pnpm check` 可校验配置。

[`@bingwu/core`](./packages/core/README.md) 供仓库内部调用模板读取、校验和项目创建 API，基本示例使用它的模板快照以便离线运行。仓库外的程序通过 [`bingwu-cli`](./packages/cli/README.md) 模块入口使用 `loadTemplates()`、`builtinTemplates` 及相关模板类型，兼容已有用法。导入模块不会执行 CLI 或发起网络请求。

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
pnpm --filter bingwu-cli publish --publish-branch main --access public --no-provenance
```

只发布 `bingwu-cli`，Core 的实现与类型声明已内置在 CLI 的构建产物中。`--no-provenance` 用于本地首发；GitHub Actions 发布保留来源证明。pnpm 将 `catalog:` 依赖转换为实际版本范围。

CLI 首发成功后，在 `bingwu-cli` 的 npm 包设置中添加 GitHub Actions Trusted Publisher：Organization / User 为 `bingwu-devkit`、Repository 为 `bingwu-cli`、Workflow filename 为 `release.yml`，Environment 留空，并允许直接发布。GitHub 仓库的 Actions 设置需要允许工作流创建 PR。

后续运行 `pnpm changeset` 为 `bingwu-cli` 记录变更并提交到 `main`；修改 Core 的实现也应记录为 CLI 的变更，因为它会随 CLI 一起发布。Release 工作流创建版本 PR，合并该 PR 后自动发布 npm 包并创建 GitHub Release。

如果版本 PR 已合并，但发布因错误配置将私有 Core 当作新 npm 包而返回 E404，修复私有包配置和 CLI 打包设置后，提交到 `main` 即可重新触发 Release。当前版本尚未发布时，可以继续发布该版本，无需再次升版本。

## 许可证

[MIT](./LICENSE.md)

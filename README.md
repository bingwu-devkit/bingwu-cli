# bingwu

个人项目创建 CLI：收藏 GitHub 仓库模板和第三方 npm 脚手架，通过一个命令快速创建项目。

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

`pnpm bingwu` 从当前工作目录运行源码，无需先构建。也可以构建后直接执行：

```bash
pnpm build
node packages/core/dist/cli.mjs list
```

要在其他目录直接使用 `bingwu`，构建后创建全局链接：

```bash
pnpm --dir packages/core link --global
bingwu list
```

## 内置模板

首次使用时初始化以下收藏，之后只读取你的配置，删除的模板不会自动恢复。

| ID              | 类型       | 来源                                   |
| --------------- | ---------- | -------------------------------------- |
| `electron-vite` | npm 脚手架 | `@quick-start/create-electron@latest`  |
| `shadcn-admin`  | GitHub     | `satnaing/shadcn-admin` 的 `main` 分支 |

Electron 模板运行 `pnpm dlx @quick-start/create-electron@latest <项目目录>`，保留官方的框架、TypeScript、更新插件和下载镜像选择。[官方指南](https://cn.electron-vite.org/guide/)

Shadcn Admin 下载仓库源码作为项目起点，保留完整界面、原始包名、许可证和其他文件，不携带 Git 历史。[原始仓库](https://github.com/satnaing/shadcn-admin)

## 创建项目

```bash
bingwu                                      # 交互选择模板和输入目录
bingwu create my-app                         # 交互选择模板
bingwu create my-app -t electron-vite
bingwu create my-admin -t shadcn-admin
bingwu create my-app -t electron-vite -- --template vue-ts
bingwu create my-admin -t shadcn-admin --install
bingwu create my-admin -t shadcn-admin --no-install
```

项目目录相对于运行命令时的工作目录解析，支持嵌套目录和绝对路径。目标只能是不存在的目录或空目录；文件、符号链接和非空目录会被拒绝，没有强制覆盖选项。

GitHub 模板下载完成后，交互模式会询问是否运行 `pnpm install`，默认不安装。`--install` 明确安装，`--no-install` 跳过询问；非交互模式默认不安装。安装失败时保留已创建的项目文件。

第三方 CLI 继承终端输入输出，在目标父目录运行。`--` 后的参数追加到收藏的默认参数之后；安装选项只用于 GitHub 模板，第三方脚手架保留自身流程。

非交互终端必须提供项目目录和 `--template`；第三方脚手架是否还需要交互由其自身决定。取消 bingwu 的交互返回退出码 130；脚手架失败时传递其退出码。不会自动启动开发服务或初始化 Git。

## 管理收藏

```bash
bingwu list
bingwu add github owner/repo --as my-template
bingwu add github https://github.com/owner/repo.git --name "我的模板"
bingwu add github owner/monorepo --as demo --ref dev --subdir examples/basic
bingwu add cli create-vite --as vite
bingwu add cli create-vite@7 --as vue --name "Vue + TS" -- "{projectDir}" --template vue-ts
bingwu remove vite
bingwu config
```

GitHub 收藏的默认 ID 是仓库名的小写形式。CLI 收藏的默认 ID 是去除 scope 和版本后的包名；未指定版本时使用 `latest`。`--as` 指定 ID，`--name` 指定显示名称。重复 ID 会报错；可先删除再添加。

CLI 默认参数为 `["{projectDir}"]`。`add cli` 的 `--` 后可以保存整组默认参数，创建时将 `{projectDir}` 替换成目标目录名称，各参数保持独立；不会拼接成 shell 命令。脚手架需要不同参数顺序时可以按其用法保存。

## 配置

`bingwu config` 显示配置文件位置。默认使用系统用户配置目录中的 `bingwu/templates.json`，由 `env-paths` 定位。所有命令都支持独立配置：

```bash
bingwu --config ./my-templates.json list
```

配置首次初始化时写入两个模板，收藏增删会保存到同一文件。无效 JSON、未知版本、重复 ID 或无效模板会报错并保留原文件。可直接编辑配置来修改收藏参数：

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
    }
  ]
}
```

GitHub 模板的 `ref`、`subdir` 可选，省略 `ref` 时使用下载工具的默认 ref。删除整个配置文件会在下一次使用时重新初始化；空的 `templates` 数组则保持为空。

## 开发与验证

```bash
pnpm bingwu --help
pnpm build
pnpm check
pnpm --filter @bingwu/example-basic start
```

`packages/core` 是可发布的 CLI 包，tsdown 构建 ESM，Vitest 验证真实配置读写、目录保护、交互选择和构建后的命令。自动测试使用临时目录及替身 pnpm，不依赖外部网络。

模块入口导出 `builtinTemplates` 和 `Template`、`GithubTemplate`、`CliTemplate`、`TemplateConfig` 类型，导入模块不会执行 CLI 或创建用户配置。示例消费该模块入口。

沿用 pnpm workspace、Turborepo、Oxlint、Oxfmt 和 Changesets。CI 覆盖 Windows / Ubuntu 与 Node.js 22 / 24。

首版统一使用 pnpm，主要处理公开 GitHub 仓库和 npm 脚手架收藏，不提供 Stars 同步、登录管理、在线模板市场或其他包管理器适配。

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

`--no-provenance` 用于本地首发；GitHub Actions 发布保留来源证明。pnpm 会将 `catalog:` 依赖转换为实际版本范围。

首发成功后，在 npm 的包设置中添加 GitHub Actions Trusted Publisher：Organization / User 为 `bingwu-devkit`、Repository 为 `bingwu-workspace`、Workflow filename 为 `release.yml`，Environment 留空，并允许直接发布。GitHub 仓库的 Actions 设置需要允许工作流创建 PR。

后续运行 `pnpm changeset` 记录变更并提交到 `main`；Release 工作流创建版本 PR，合并该 PR 后自动发布 npm 包并创建 GitHub Release。

## 许可证

[MIT](./LICENSE.md)

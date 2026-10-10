# bingwu

收藏 GitHub 仓库模板和 npm 脚手架，快速创建项目。

需要 Node.js 22.18+ 或 24.x，以及 pnpm 11.15.1。

## 使用

```bash
pnpm add --global bingwu-cli
bingwu
```

也可以通过 `pnpm dlx bingwu-cli` 直接运行。包名为 `bingwu-cli`，命令名为 `bingwu`。

首次使用内置 Electron Vite 官方脚手架，以及 Shadcn Admin、Shadcn Vue Admin 和 TypeScript Library Starter GitHub 模板：

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

## 管理收藏

```bash
bingwu add github owner/repo --as my-template
bingwu add github owner/monorepo --as demo --ref main --subdir examples/app
bingwu add cli create-vite --as vite
bingwu add cli create-vite@7 --as vue -- "{projectDir}" --template vue-ts
bingwu remove vite
bingwu config
bingwu --config ./my-templates.json list
```

CLI 默认参数为 `["{projectDir}"]`；创建时将占位符替换为目标目录名称。收藏保存在系统用户配置目录下的 `bingwu/templates.json`，无效配置会报错并保留原文件。

已有配置升级后会保留原收藏；可以手动添加新模板（均使用 `main` 分支）：

```bash
bingwu add github Whbbit1999/shadcn-vue-admin --as shadcn-vue-admin --name "Shadcn Vue Admin" --ref main
bingwu add github bingwu-devkit/starter-ts --as starter-ts --name "TypeScript Library Starter" --ref main
```

## 模块入口

导出 `builtinTemplates` 及 `Template`、`GithubTemplate`、`CliTemplate`、`TemplateConfig` 类型。导入模块不会运行 CLI 或创建配置。

完整用法见[项目文档](https://github.com/bingwu-devkit/bingwu-workspace#readme)。

## 许可证

[MIT](./LICENSE.md)

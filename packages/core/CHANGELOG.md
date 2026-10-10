# bingwu-cli

## 0.3.0

### Minor Changes

- [`3ceeb81`](https://github.com/bingwu-devkit/bingwu-workspace/commit/3ceeb8100dbfa5ae8f80d74b40d410a1d84360ff) Thanks [@BINGWU2003](https://github.com/BINGWU2003)! - 移除 add、remove、config 命令及 --config 选项，列表和项目创建统一读取 GitHub main 分支的 templates.json，并通过 Zod 校验远程配置。旧的本地收藏配置不再参与模板选择；新增 loadTemplates 模块接口，builtinTemplates 保留为发布时的配置快照。

## 0.2.0

### Minor Changes

- [`8dd4919`](https://github.com/bingwu-devkit/bingwu-workspace/commit/8dd49192e0e7e284405c0457e156d9a3dd7f3d22) Thanks [@BINGWU2003](https://github.com/BINGWU2003)! - 新增 Shadcn Vue Admin 和 TypeScript Library Starter 内置 GitHub 模板，均使用 main 分支，并补充创建项目及已有配置添加模板的说明。

## 0.1.0

### Minor Changes

- 新增 bingwu 项目创建 CLI，内置 electron-vite 和 shadcn-admin，并支持 GitHub 模板与第三方脚手架收藏管理。

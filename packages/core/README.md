# bingwu Core

`bingwu-core` 提供模板读取、配置校验和项目创建 API，供 `bingwu-cli` 和其他程序复用。

需要 Node.js 22.18+ 或 24.x。

## 安装与使用

```bash
pnpm add bingwu-core
```

```ts
import { createProject, loadTemplates } from 'bingwu-core'

const templates = await loadTemplates()
const template = templates.find((item) => item.id === 'starter-ts')
if (!template) throw new Error('未找到 starter-ts 模板')

await createProject({
  template,
  directory: 'my-library',
  extraArgs: [],
})
```

`loadTemplates()` 每次读取 [远程 templates.json](https://github.com/bingwu-devkit/bingwu-cli/blob/main/templates.json)，请求超时为 15 秒。`builtinTemplates` 是发布时的模板快照，可用于离线展示。导入模块不会发起网络请求或执行命令。

`createProject()` 下载 GitHub 模板或运行配置中的第三方 npm 脚手架，返回创建后的绝对目录。目标必须不存在或为空，不会覆盖已有内容；它不会自动安装 GitHub 模板的依赖，按需调用 `installDependencies(directory)`。第三方脚手架和安装依赖需要 pnpm。

## API

- `loadTemplates()`：读取并校验最新远程模板配置。
- `builtinTemplates`：发布时的只读模板快照。
- `parseConfig(value)`、`parseTemplate(value)`：校验并规范化模板配置。
- `templateSource(template)`：获取用于展示或下载的模板来源。
- `createProject(options, services?)`：创建项目，可注入下载和执行服务。
- `installDependencies(directory)`：在指定目录运行 `pnpm install`。
- `UserError`、`errorMessage(error)`：统一的用户错误类型和消息处理。

导出 `Template`、`GithubTemplate`、`CliTemplate`、`TemplateConfig`、`CreateOptions`、`CreateServices` 和 `PnpmRunner` 类型。

命令行用法见 [`bingwu-cli`](../cli/README.md)，完整说明见[项目文档](https://github.com/bingwu-devkit/bingwu-cli#readme)。

## 许可证

[MIT](https://github.com/bingwu-devkit/bingwu-cli/blob/main/LICENSE.md)

# @bingwu/core

## 0.1.0

### Minor Changes

- [`5293a0f`](https://github.com/bingwu-devkit/bingwu-cli/commit/5293a0f4e898ed2db70c22b618066bb8c40704e7) Thanks [@BINGWU2003](https://github.com/BINGWU2003)! - 将命令行入口、参数解析与交互拆分到 packages/cli，保留 bingwu-cli 包名和 bingwu 命令。新增 @bingwu/core 包，提供模板读取、配置校验和项目创建 API；CLI 通过工作区依赖使用 Core，并兼容原有模块导入。

---
'bingwu-cli': minor
'bingwu-core': minor
---

将命令行入口、参数解析与交互拆分到 packages/cli，保留 bingwu-cli 包名和 bingwu 命令。新增 bingwu-core 包，提供模板读取、配置校验和项目创建 API；CLI 通过工作区依赖使用 Core，并兼容原有模块导入。

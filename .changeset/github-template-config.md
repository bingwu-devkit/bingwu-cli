---
'bingwu-cli': minor
---

移除 add、remove、config 命令及 --config 选项，列表和项目创建统一读取 GitHub main 分支的 templates.json，并通过 Zod 校验远程配置。旧的本地收藏配置不再参与模板选择；新增 loadTemplates 模块接口，builtinTemplates 保留为发布时的配置快照。

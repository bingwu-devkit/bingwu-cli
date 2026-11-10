---
'bingwu-cli': minor
---

在交互选择模板时显示当前高亮项的完整 GitHub 仓库地址，所有地址统一以完整 URL 配置在 templates.json 的 repo 字段中。为 npm 脚手架模板新增可选的 repo 展示字段，并为所有内置模板补齐仓库信息；Electron Vite 的仓库地址统一为 https://github.com/alex8088/electron-vite，未配置 repo 的旧脚手架模板继续显示 ID 和类型。

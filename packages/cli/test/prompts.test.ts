import { select } from '@clack/prompts'
import type { createProject, Template } from '@bingwu/core'
import { describe, expect, it, vi } from 'vitest'

import templateConfig from '../../../templates.json' with { type: 'json' }
import { runCli } from '../src/app.js'

vi.mock('@clack/prompts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@clack/prompts')>()),
  select: vi.fn<typeof select>(),
}))

const templates: Template[] = [
  {
    id: 'admin',
    name: 'Admin',
    type: 'github',
    repo: 'owner/admin',
    ref: 'develop',
    subdir: 'examples/app',
  },
  {
    id: 'forge',
    name: 'Electron Forge',
    type: 'cli',
    package: 'create-electron-app@latest',
    args: ['{projectDir}'],
    repo: 'electron/forge',
  },
  { id: 'legacy', name: 'Legacy CLI', type: 'cli', package: 'create-app@latest', args: [] },
]

describe('默认模板选择提示', () => {
  it('官方交互模板的地址从远程模板 JSON 读取', async () => {
    const fetchConfig = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify(templateConfig)),
    )
    vi.stubGlobal('fetch', fetchConfig)
    vi.mocked(select).mockResolvedValue(Symbol('cancel'))
    expect(
      await runCli(['create', 'app'], {
        interactive: true,
        write: vi.fn<(message: string) => void>(),
        error: vi.fn<(message: string) => void>(),
      }),
    ).toBe(130)
    expect(fetchConfig).toHaveBeenCalledOnce()
    expect(select).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'electron-vite',
            hint: 'https://github.com/alex8088/electron-vite',
          }),
          expect.objectContaining({
            value: 'electron-forge',
            hint: 'https://github.com/electron/forge',
          }),
          expect.objectContaining({
            value: 'fumadocs',
            hint: 'https://github.com/fuma-nama/fumadocs',
          }),
          expect.objectContaining({
            value: 'unibest',
            hint: 'https://github.com/feige996/unibest',
          }),
        ]),
      }),
    )
  })

  it.each([
    {
      package: 'create-electron-app@latest',
      repo: 'custom/forge',
      hint: 'https://github.com/custom/forge',
    },
    { package: 'create-electron-app@latest', hint: 'electron-forge · cli' },
    { package: 'create-other-app@latest', hint: 'electron-forge · cli' },
  ])('仅使用配置的仓库，不按包名或模板 ID 推测地址：%j', async (metadata) => {
    const { hint, ...source } = metadata
    const template: Template = {
      id: 'electron-forge',
      name: 'Forge',
      type: 'cli',
      args: [],
      ...source,
    }
    vi.mocked(select).mockResolvedValue(Symbol('cancel'))
    expect(
      await runCli(['create', 'app'], {
        interactive: true,
        loadTemplates: async () => [template],
        write: vi.fn<(message: string) => void>(),
        error: vi.fn<(message: string) => void>(),
      }),
    ).toBe(130)
    expect(select).toHaveBeenCalledExactlyOnceWith({
      message: '选择项目模板',
      options: [{ value: 'electron-forge', label: 'Forge', hint }],
    })
  })

  it.each(templates)('显示仓库或兼容旧提示，并用 ID 选择模板：$id', async (template) => {
    vi.mocked(select).mockResolvedValue(template.id)
    const create = vi.fn<typeof createProject>(async () => '/created/app')
    expect(
      await runCli(['create', 'app'], {
        interactive: true,
        loadTemplates: async () => templates,
        chooseInstall: async () => false,
        create,
        write: vi.fn<(message: string) => void>(),
        error: vi.fn<(message: string) => void>(),
      }),
    ).toBe(0)
    expect(select).toHaveBeenCalledExactlyOnceWith({
      message: '选择项目模板',
      options: [
        { value: 'admin', label: 'Admin', hint: 'https://github.com/owner/admin' },
        { value: 'forge', label: 'Electron Forge', hint: 'https://github.com/electron/forge' },
        { value: 'legacy', label: 'Legacy CLI', hint: 'legacy · cli' },
      ],
    })
    expect(create).toHaveBeenCalledExactlyOnceWith({ template, directory: 'app', extraArgs: [] })
  })

  it('取消默认选择器返回 130，且不创建项目', async () => {
    vi.mocked(select).mockResolvedValue(Symbol('cancel'))
    const create = vi.fn<typeof createProject>()
    expect(
      await runCli(['create', 'app'], {
        interactive: true,
        loadTemplates: async () => templates,
        create,
        write: vi.fn<(message: string) => void>(),
        error: vi.fn<(message: string) => void>(),
      }),
    ).toBe(130)
    expect(create).not.toHaveBeenCalled()
  })
})

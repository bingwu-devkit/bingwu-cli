import { describe, expect, it, vi } from 'vitest'

import templateConfig from '../../../templates.json' with { type: 'json' }
import { loadTemplates, templateConfigUrl } from '../src/config.js'
import { UserError } from '../src/errors.js'
import { builtinTemplates } from '../src/templates.js'

const response = (config: unknown) => new Response(JSON.stringify(config))

describe('GitHub 统一模板配置', () => {
  it('从指定仓库读取并校验配置，发布快照来自同一配置文件', async () => {
    const fetchConfig = vi.fn<typeof fetch>(async () => response(templateConfig))
    const templates = await loadTemplates(fetchConfig)
    expect(templates).toEqual(builtinTemplates)
    expect(templates.map((template) => template.id)).toEqual([
      'electron-vite',
      'fumadocs',
      'unibest',
      'shadcn-admin',
      'shadcn-vue-admin',
      'pure-admin-thin',
      'art-design-pro-thin',
      'starter-ts',
    ])
    expect(fetchConfig).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/bingwu-devkit/bingwu-cli/main/templates.json',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({ 'Cache-Control': 'no-cache' }),
      }),
    )
  })

  it('每次重新读取远程配置，不缓存旧模板列表', async () => {
    const updated = {
      version: 1,
      templates: [{ id: 'new', name: 'New', type: 'github', repo: 'owner/new' }],
    }
    const fetchConfig = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(templateConfig))
      .mockResolvedValueOnce(response(updated))
    await loadTemplates(fetchConfig)
    expect(await loadTemplates(fetchConfig)).toEqual(updated.templates)
    expect(fetchConfig).toHaveBeenCalledTimes(2)
  })

  it('保留 Zod 规范化行为，并允许空列表', async () => {
    const fetchConfig = vi.fn<typeof fetch>(async () =>
      response({
        version: 1,
        templates: [
          { id: ' cli ', name: ' CLI ', type: 'cli', package: ' create-vite ', args: [] },
        ],
      }),
    )
    expect(await loadTemplates(fetchConfig)).toEqual([
      { id: 'cli', name: 'CLI', type: 'cli', package: 'create-vite@latest', args: [] },
    ])
    fetchConfig.mockResolvedValue(response({ version: 1, templates: [] }))
    expect(await loadTemplates(fetchConfig)).toEqual([])
  })

  it.each([404, 503])('HTTP %s 返回包含配置地址的错误', async (status) => {
    const fetchConfig = vi.fn<typeof fetch>(async () => new Response('', { status }))
    await expect(loadTemplates(fetchConfig)).rejects.toThrow(
      new UserError(`无法获取模板配置 ${templateConfigUrl}：HTTP ${status}。`),
    )
  })

  it.each([
    new TypeError('fetch failed'),
    new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
  ])('网络失败或超时时提示重试，不回退到旧快照：%s', async (error) => {
    const fetchConfig = vi.fn<typeof fetch>().mockRejectedValue(error)
    await expect(loadTemplates(fetchConfig)).rejects.toThrow(
      error.name === 'TimeoutError' ? '请求超时（15 秒）' : 'fetch failed',
    )
    await expect(loadTemplates(fetchConfig)).rejects.toThrow('请检查网络后重试')
  })

  it('响应体读取失败也报告网络错误', async () => {
    const fetchConfig = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error('connection closed'))
            },
          }),
        ),
    )
    await expect(loadTemplates(fetchConfig)).rejects.toThrow('connection closed')
    await expect(loadTemplates(fetchConfig)).rejects.toThrow('请检查网络后重试')
  })

  it.each([
    '{broken',
    JSON.stringify({ version: 2, templates: [] }),
    JSON.stringify({ version: 1, templates: [{ id: 'bad' }] }),
    JSON.stringify({
      version: 1,
      templates: [
        { id: 'same', name: 'A', type: 'github', repo: 'owner/a' },
        { id: 'same', name: 'B', type: 'github', repo: 'owner/b' },
      ],
    }),
  ])('拒绝无效 JSON、版本、模板或重复 ID：%s', async (content) => {
    const fetchConfig = vi.fn<typeof fetch>(async () => new Response(content))
    await expect(loadTemplates(fetchConfig)).rejects.toThrow(
      `远程模板配置无效 ${templateConfigUrl}`,
    )
  })
})

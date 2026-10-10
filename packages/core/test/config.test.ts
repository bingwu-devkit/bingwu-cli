import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { addTemplate, readConfig, removeTemplate } from '../src/config.js'
import { normalizeGithubRepo, normalizeNpmPackage, parseTemplate } from '../src/templates.js'

let temporary: string
let file: string

beforeEach(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'bingwu-config-test-'))
  file = path.join(temporary, 'templates.json')
})

afterEach(async () => {
  await rm(temporary, { recursive: true, force: true })
})

describe('收藏配置', () => {
  it('初始化两个模板，并持久保存新增与删除，包括删除内置模板', async () => {
    expect((await readConfig(file)).templates.map((template) => template.id)).toEqual([
      'electron-vite',
      'shadcn-admin',
    ])
    await addTemplate(file, {
      id: 'vite',
      name: 'Vite',
      type: 'cli',
      package: 'create-vite',
      args: ['{projectDir}', '--template', 'vue-ts'],
    })
    await removeTemplate(file, 'electron-vite')
    const config = await readConfig(file)
    expect(config.templates.map((template) => template.id)).toEqual(['shadcn-admin', 'vite'])
    expect(config.templates[1]).toMatchObject({ package: 'create-vite@latest' })
    await removeTemplate(file, 'vite')
    await removeTemplate(file, 'shadcn-admin')
    expect((await readConfig(file)).templates).toEqual([])
  })

  it('拒绝重复 ID 和删除不存在的条目，并保留配置', async () => {
    await readConfig(file)
    const original = await readFile(file, 'utf8')
    await expect(
      addTemplate(file, { id: 'shadcn-admin', name: '重复', type: 'github', repo: 'owner/repo' }),
    ).rejects.toThrow('已存在')
    await expect(removeTemplate(file, 'missing')).rejects.toThrow('未找到')
    expect(await readFile(file, 'utf8')).toBe(original)
  })

  it.each([
    '{broken',
    '{"version":2,"templates":[]}',
    '{"version":1,"templates":[{"id":"a","name":"A","type":"cli","package":"create-vite","args":"bad"}]}',
    '{"version":1,"templates":[{"id":"a","name":"A","type":"github","repo":"a/b"},{"id":"a","name":"A","type":"github","repo":"a/b"}]}',
  ])('报告配置问题并保留原文件：%s', async (content) => {
    await writeFile(file, content)
    await expect(readConfig(file)).rejects.toThrow(file)
    expect(await readFile(file, 'utf8')).toBe(content)
  })

  it('可以并发首次读取，不互相覆盖初始化文件', async () => {
    const configs = await Promise.all([readConfig(file), readConfig(file)])
    expect(configs[0]).toEqual(configs[1])
    expect((await readConfig(file)).templates).toHaveLength(2)
  })
})

describe('收藏来源', () => {
  it('解析仓库 URL、scoped npm 包和版本', () => {
    expect(normalizeGithubRepo('https://github.com/satnaing/shadcn-admin.git/')).toBe(
      'satnaing/shadcn-admin',
    )
    expect(normalizeNpmPackage('@quick-start/create-electron')).toEqual({
      package: '@quick-start/create-electron@latest',
      id: 'create-electron',
    })
    expect(normalizeNpmPackage('create-vite@^7.0.0')).toEqual({
      package: 'create-vite@^7.0.0',
      id: 'create-vite',
    })
  })

  it.each([
    'https://gitlab.com/a/b',
    'https://github.com/a/b/tree/main',
    'a/..',
    'https://github.com/a/b?tab=readme',
  ])('拒绝非仓库来源：%s', (source) => {
    expect(() => normalizeGithubRepo(source)).toThrow(/仓库/)
  })

  it.each(['../outside', '/absolute', 'dir\\nested', 'dir/../outside'])(
    '拒绝无效子目录：%s',
    (subdir) => {
      expect(() =>
        parseTemplate({ id: 'test', name: 'Test', type: 'github', repo: 'a/b', subdir }),
      ).toThrow('subdir')
    },
  )

  it.each(['https://example.com/script.js', 'pkg@file:../script', 'pkg with spaces', '@scope'])(
    '拒绝非 npm 包来源：%s',
    (source) => {
      expect(() => normalizeNpmPackage(source)).toThrow(/npm 包名/)
    },
  )
})

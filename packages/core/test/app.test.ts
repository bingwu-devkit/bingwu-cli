import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runCli } from '../src/app.js'
import { readConfig } from '../src/config.js'
import type { createProject, installDependencies } from '../src/create.js'
import { CancelledError, UserError } from '../src/errors.js'

let temporary: string
let file: string
const write = vi.fn<(message: string) => void>()
const error = vi.fn<(message: string) => void>()

beforeEach(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'bingwu-app-test-'))
  file = path.join(temporary, 'templates.json')
})

afterEach(async () => {
  await rm(temporary, { recursive: true, force: true })
})

const run = (args: string[], services: Parameters<typeof runCli>[1] = {}) =>
  runCli(['--config', file, ...args], { interactive: false, write, error, ...services })

describe('命令与交互', () => {
  it('添加仓库、保存默认 CLI 参数，创建时保留参数边界', async () => {
    expect(
      await run([
        'add',
        'github',
        'https://github.com/owner/Repo.git',
        '--ref',
        'dev',
        '--subdir',
        'examples/app',
        '--name',
        '仓库',
      ]),
    ).toBe(0)
    expect(
      await run([
        'add',
        'cli',
        'create-vite@7',
        '--as',
        'vite',
        '--',
        '{projectDir}',
        '--template',
        'vue-ts',
      ]),
    ).toBe(0)
    const config = await readConfig(file)
    expect(config.templates[2]).toMatchObject({
      id: 'repo',
      name: '仓库',
      repo: 'owner/Repo',
      ref: 'dev',
      subdir: 'examples/app',
    })
    const create = vi.fn<typeof createProject>(async () => 'created')
    expect(
      await run(['create', 'my app', '-t', 'vite', '--', '--title', 'two words'], { create }),
    ).toBe(0)
    expect(create).toHaveBeenCalledWith({
      directory: 'my app',
      template: config.templates[3],
      extraArgs: ['--title', 'two words'],
    })
  })

  it('无参数进入交互，选择模板与目录；第三方 CLI 不重复询问安装', async () => {
    const chooseTemplate = vi.fn<() => Promise<string>>(async () => 'electron-vite')
    const chooseDirectory = vi.fn<() => Promise<string>>(async () => 'my-electron')
    const chooseInstall = vi.fn<() => Promise<boolean>>(async () => true)
    const create = vi.fn<typeof createProject>(async () => 'created')
    expect(
      await run([], { interactive: true, chooseTemplate, chooseDirectory, chooseInstall, create }),
    ).toBe(0)
    expect(chooseTemplate).toHaveBeenCalledOnce()
    expect(chooseDirectory).toHaveBeenCalledOnce()
    expect(chooseInstall).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        directory: 'my-electron',
        template: expect.objectContaining({ id: 'electron-vite' }),
      }),
    )
  })

  it.each(['', '   ', '\t\n'])('拒绝交互返回的空白项目目录：%j', async (directory) => {
    const create = vi.fn<typeof createProject>(async () => 'created')
    expect(
      await run(['create', '-t', 'electron-vite'], {
        interactive: true,
        chooseDirectory: async () => directory,
        create,
      }),
    ).toBe(1)
    expect(error).toHaveBeenCalledWith('错误：项目目录不能为空。')
    expect(create).not.toHaveBeenCalled()
  })

  it('命令行目录去掉首尾空白，自定义交互服务的目录保留原值', async () => {
    const create = vi.fn<typeof createProject>(async () => 'created')
    expect(await run(['create', ' my app ', '-t', 'electron-vite'], { create })).toBe(0)
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ directory: 'my app' }))
    expect(
      await run(['create', '-t', 'electron-vite'], {
        interactive: true,
        chooseDirectory: async () => ' my app ',
        create,
      }),
    ).toBe(0)
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ directory: ' my app ' }))
  })

  it('GitHub 默认询问安装，选择安装失败后保留项目并返回退出码', async () => {
    const target = path.join(temporary, 'app')
    const create = async () => {
      await mkdir(target)
      await writeFile(path.join(target, 'package.json'), '{"name":"keep"}')
      return target
    }
    const chooseInstall = vi.fn<() => Promise<boolean>>(async () => true)
    const install = vi.fn<typeof installDependencies>(async () => {
      throw new UserError('安装失败', 9)
    })
    expect(
      await run(['create', target, '-t', 'shadcn-admin'], {
        interactive: true,
        create,
        chooseInstall,
        install,
      }),
    ).toBe(9)
    expect(chooseInstall).toHaveBeenCalledOnce()
    expect(install).toHaveBeenCalledWith(target)
    expect(await readFile(path.join(target, 'package.json'), 'utf8')).toBe('{"name":"keep"}')
  })

  it.each([
    { flag: '--install', interactive: false, installed: true },
    { flag: '--no-install', interactive: true, installed: false },
    { flag: undefined, interactive: false, installed: false },
  ])('处理安装选项：$flag，交互：$interactive', async ({ flag, interactive, installed }) => {
    const create = vi.fn<typeof createProject>(async () => 'created')
    const install = vi.fn<typeof installDependencies>(async () => {})
    const chooseInstall = vi.fn<() => Promise<boolean>>(async () => true)
    expect(
      await run(['create', 'app', '-t', 'shadcn-admin', ...(flag ? [flag] : [])], {
        interactive,
        create,
        install,
        chooseInstall,
      }),
    ).toBe(0)
    expect(install).toHaveBeenCalledTimes(installed ? 1 : 0)
    expect(chooseInstall).not.toHaveBeenCalled()
  })

  it('交互选择不安装时不安装依赖', async () => {
    const install = vi.fn<typeof installDependencies>(async () => {})
    expect(
      await run(['create', 'app', '-t', 'shadcn-admin'], {
        interactive: true,
        create: async () => 'created',
        chooseInstall: async () => false,
        install,
      }),
    ).toBe(0)
    expect(install).not.toHaveBeenCalled()
  })

  it.each([
    ['create'],
    ['create', 'app'],
    ['create', '   ', '-t', 'shadcn-admin'],
    ['create', 'app', '-t', 'missing'],
  ])('参数不完整或 ID 无效时停止：%j', async (...args) => {
    const create = vi.fn<typeof createProject>(async () => 'created')
    const chooseDirectory = vi.fn<() => Promise<string>>(async () => 'unexpected')
    expect(await run(args, { create, chooseDirectory })).toBe(1)
    expect(create).not.toHaveBeenCalled()
    expect(chooseDirectory).not.toHaveBeenCalled()
  })

  it('取消交互返回 130，且不创建项目', async () => {
    const create = vi.fn<typeof createProject>(async () => 'created')
    expect(
      await run([], {
        interactive: true,
        chooseTemplate: async () => {
          throw new CancelledError()
        },
        create,
      }),
    ).toBe(130)
    expect(create).not.toHaveBeenCalled()
  })

  it('配置路径、列表、删除和空清单有可用输出', async () => {
    expect(await run(['config'])).toBe(0)
    expect(write).toHaveBeenCalledWith(file)
    expect(await run(['list'])).toBe(0)
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('@quick-start/create-electron@latest'),
    )
    expect(await run(['remove', 'electron-vite'])).toBe(0)
    expect(await run(['remove', 'shadcn-admin'])).toBe(0)
    expect(await run(['create', 'app', '-t', 'shadcn-admin'])).toBe(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('清单为空'))
  })
})

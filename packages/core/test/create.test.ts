import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProject } from '../src/create.js'
import type { PnpmRunner } from '../src/create.js'
import { UserError } from '../src/errors.js'
import type { CliTemplate, GithubTemplate } from '../src/templates.js'

let temporary: string
const github: GithubTemplate = {
  id: 'repo',
  name: 'Repo',
  type: 'github',
  repo: 'owner/repo',
  ref: 'feature/demo',
  subdir: 'examples/basic',
}
const cli: CliTemplate = {
  id: 'cli',
  name: 'CLI',
  type: 'cli',
  package: 'create-vite@latest',
  args: ['{projectDir}', '--template', 'vue-ts'],
}

type Downloader = (source: string, options: { dir: string }) => Promise<void>

const failDownload: Downloader = async (_source, options) => {
  await mkdir(options.dir)
  await writeFile(path.join(options.dir, 'partial.txt'), 'partial')
  throw new Error('network failed')
}

beforeEach(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'bingwu-create-test-'))
})

afterEach(async () => {
  await rm(temporary, { recursive: true, force: true })
})

describe('创建项目', () => {
  it('暂存仓库，保留原始文件，成功后放入空目录并清理暂存目录', async () => {
    const target = path.join(temporary, 'my app')
    await mkdir(target)
    const manifest = '{"name":"original-name","private":false}'
    const download = vi.fn<Downloader>(async (_source, options) => {
      await mkdir(options.dir)
      await writeFile(path.join(options.dir, 'package.json'), manifest)
      await writeFile(path.join(options.dir, 'LICENSE'), 'original license')
    })
    await expect(
      createProject({ template: github, directory: target, extraArgs: [] }, { download }),
    ).resolves.toBe(target)
    expect(download).toHaveBeenCalledWith(
      'github:owner/repo/examples/basic#feature/demo',
      expect.objectContaining({ force: false, forceClean: false, registry: false }),
    )
    expect(await readFile(path.join(target, 'package.json'), 'utf8')).toBe(manifest)
    expect(await readFile(path.join(target, 'LICENSE'), 'utf8')).toBe('original license')
    expect(await readdir(temporary)).toEqual(['my app'])
  })

  it('下载失败时不向目标目录写入部分文件', async () => {
    const target = path.join(temporary, 'app')
    await expect(
      createProject(
        { template: github, directory: target, extraArgs: [] },
        { download: failDownload },
      ),
    ).rejects.toThrow('network failed')
    expect(await readdir(temporary)).toEqual([])
  })

  it('下载过程中目标被写入时停止，保留已有文件', async () => {
    const target = path.join(temporary, 'app')
    const download = async (_source: string, options: { dir: string }) => {
      await mkdir(options.dir)
      await writeFile(path.join(options.dir, 'README.md'), 'template')
      await mkdir(target)
      await writeFile(path.join(target, 'keep.txt'), 'keep')
    }
    await expect(
      createProject({ template: github, directory: target, extraArgs: [] }, { download }),
    ).rejects.toThrow('非空')
    expect(await readFile(path.join(target, 'keep.txt'), 'utf8')).toBe('keep')
    expect(await readdir(temporary)).toEqual(['app'])
  })

  it.each(['file', 'directory', 'link'])('拒绝已有%s，且不运行脚手架', async (kind) => {
    const target = path.join(temporary, 'target')
    if (kind === 'file') await writeFile(target, 'keep')
    if (kind === 'directory') {
      await mkdir(target)
      await writeFile(path.join(target, 'keep'), 'keep')
    }
    if (kind === 'link') {
      const destination = path.join(temporary, 'destination')
      await mkdir(destination)
      await symlink(destination, target, process.platform === 'win32' ? 'junction' : 'dir')
    }
    const run = vi.fn<PnpmRunner>()
    await expect(
      createProject({ template: cli, directory: target, extraArgs: [] }, { run }),
    ).rejects.toThrow(/目标/)
    expect(run).not.toHaveBeenCalled()
  })

  it('在目标父目录执行脚手架，并按数组替换占位符和透传参数', async () => {
    const parent = path.join(temporary, 'nested parent')
    const target = path.join(parent, 'my app')
    const run = vi.fn<PnpmRunner>(async (_args, cwd) => {
      await mkdir(path.join(cwd, 'my app'))
      await writeFile(path.join(target, 'package.json'), '{}')
    })
    await createProject(
      {
        template: cli,
        directory: target,
        extraArgs: ['--title', 'two words', '--template', 'react-ts'],
      },
      { run },
    )
    expect(run).toHaveBeenCalledWith(
      [
        'dlx',
        'create-vite@latest',
        'my app',
        '--template',
        'vue-ts',
        '--title',
        'two words',
        '--template',
        'react-ts',
      ],
      parent,
    )
  })

  it('脚手架失败时保留生成文件并传递失败', async () => {
    const target = path.join(temporary, 'app')
    const run = async () => {
      await mkdir(target)
      await writeFile(path.join(target, 'partial.txt'), 'keep')
      throw new UserError('脚手架失败', 7)
    }
    await expect(
      createProject({ template: cli, directory: target, extraArgs: [] }, { run }),
    ).rejects.toMatchObject({ exitCode: 7 })
    expect(await readFile(path.join(target, 'partial.txt'), 'utf8')).toBe('keep')
  })

  it('脚手架退出成功但没有生成文件时不报告成功', async () => {
    await expect(
      createProject(
        { template: cli, directory: path.join(temporary, 'app'), extraArgs: [] },
        { run: async () => {} },
      ),
    ).rejects.toThrow('未生成')
  })
})

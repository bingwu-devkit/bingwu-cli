import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { builtinTemplates } from 'bingwu-core'
import { execa } from 'execa'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import packageJson from '../package.json' with { type: 'json' }
const cli = fileURLToPath(new URL('../dist/cli.mjs', import.meta.url))
let temporary: string
let file: string
let fetchPreload: string
let executableDirectory: string

beforeEach(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'bingwu-bin-test-'))
  file = path.join(temporary, 'remote-templates.json')
  await writeFile(file, JSON.stringify({ version: 1, templates: builtinTemplates }))
  fetchPreload = path.join(temporary, 'fetch-fixture.mjs')
  await writeFile(
    fetchPreload,
    `import { readFile } from 'node:fs/promises'
globalThis.fetch = async (url) => {
  if (url !== 'https://raw.githubusercontent.com/bingwu-devkit/bingwu-cli/main/templates.json') {
    throw new Error('unexpected template URL: ' + url)
  }
  if (process.env.FAKE_TEMPLATE_NETWORK_ERROR) throw new TypeError('fetch failed')
  return new Response(await readFile(${JSON.stringify(file)}, 'utf8'))
}
`,
  )
  executableDirectory = path.join(temporary, 'fake-bin')
  await mkdir(executableDirectory)
  const script = `import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const args = process.argv.slice(2)
if (process.env.FAKE_PNPM_EXIT) process.exit(Number(process.env.FAKE_PNPM_EXIT))
if (!process.env.FAKE_PNPM_NO_FILES && args[0] === 'dlx') {
  const target = path.join(process.cwd(), args[2])
  await mkdir(target, { recursive: true })
  await writeFile(path.join(target, 'arguments.json'), JSON.stringify({ args, cwd: process.cwd() }))
}
`
  const scriptFile = path.join(executableDirectory, 'fake-pnpm.mjs')
  await writeFile(scriptFile, script)
  if (process.platform === 'win32') {
    await writeFile(
      path.join(executableDirectory, 'pnpm.cmd'),
      `@echo off\r\n"${process.execPath}" "%~dp0fake-pnpm.mjs" %*\r\n`,
    )
  } else {
    const executable = path.join(executableDirectory, 'pnpm')
    await writeFile(executable, `#!/usr/bin/env node\n${script}`)
    await chmod(executable, 0o755)
  }
})

afterEach(async () => {
  await rm(temporary, { recursive: true, force: true })
})

function run(args: string[], environment: Record<string, string> = {}) {
  return execa(process.execPath, ['--import', pathToFileURL(fetchPreload).href, cli, ...args], {
    cwd: temporary,
    reject: false,
    env: {
      PATH: `${executableDirectory}${path.delimiter}${process.env.PATH ?? ''}`,
      ...environment,
    },
  })
}

describe('构建后的命令', () => {
  it('入口包含 shebang，help、version 和 list 可以直接执行', async () => {
    expect(await readFile(cli, 'utf8')).toMatch(/^#!\/usr\/bin\/env node\n/)
    const help = await run(['--help'], { FAKE_TEMPLATE_NETWORK_ERROR: '1' })
    expect(help.exitCode).toBe(0)
    expect(help.stdout).toContain('create')
    expect(help.stdout).not.toContain('--config')
    expect(help.stdout).not.toContain('remove')
    const version = await run(['--version'], { FAKE_TEMPLATE_NETWORK_ERROR: '1' })
    expect(version.exitCode).toBe(0)
    expect(version.stdout).toBe(packageJson.version)
    const list = await run(['list'])
    expect(list.exitCode).toBe(0)
    expect(list.stdout).toContain('electron-vite')
    expect(list.stdout).toContain('satnaing/shadcn-admin#main')
    expect(list.stdout).toContain('Whbbit1999/shadcn-vue-admin#main')
    expect(list.stdout).toContain('bingwu-devkit/starter-ts#main')
  })

  it('从远程配置选择脚手架，创建带空格的目录并透传参数', async () => {
    await writeFile(
      file,
      JSON.stringify({
        version: 1,
        templates: [
          {
            id: 'vite',
            name: 'Vite',
            type: 'cli',
            package: 'create-vite',
            args: ['{projectDir}', '--template', 'vue-ts'],
          },
        ],
      }),
    )
    const result = await run([
      'create',
      'nested parent/my app',
      '-t',
      'vite',
      '--',
      '--title',
      'two words',
    ])
    expect(result.exitCode).toBe(0)
    const recorded: unknown = JSON.parse(
      await readFile(path.join(temporary, 'nested parent', 'my app', 'arguments.json'), 'utf8'),
    )
    expect(recorded).toEqual({
      args: ['dlx', 'create-vite@latest', 'my app', '--template', 'vue-ts', '--title', 'two words'],
      cwd: path.join(temporary, 'nested parent'),
    })
    const list = await run(['list'])
    expect(list.stdout).toContain('create-vite@latest')
    expect(list.stdout).not.toContain('electron-vite')
  })

  it.each([
    ['add', 'github', 'owner/repo'],
    ['remove', 'electron-vite'],
    ['config'],
    ['--config', 'old.json', 'list'],
  ])('构建后也拒绝收藏命令及本地配置选项：%j', async (...args) => {
    const result = await run(args)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/unknown (command|option)|too many arguments/)
  })

  it('远程配置读取失败时返回错误，并停止创建项目', async () => {
    const result = await run(['create', 'app', '-t', 'electron-vite'], {
      FAKE_TEMPLATE_NETWORK_ERROR: '1',
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('无法获取模板配置')
    expect(result.stderr).toContain('fetch failed')
    await expect(readFile(path.join(temporary, 'app', 'arguments.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('传递子进程失败码，且脚手架未生成文件时返回失败', async () => {
    const failed = await run(['create', 'app', '-t', 'electron-vite'], { FAKE_PNPM_EXIT: '7' })
    expect(failed.exitCode).toBe(7)
    const empty = await run(['create', 'app', '-t', 'electron-vite'], { FAKE_PNPM_NO_FILES: '1' })
    expect(empty.exitCode).toBe(1)
    expect(empty.stderr).toContain('未生成项目文件')
  })

  it('拒绝非空目录，并保留原始内容', async () => {
    await mkdir(path.join(temporary, 'app'))
    await writeFile(path.join(temporary, 'app', 'keep.txt'), 'keep')
    const result = await run(['create', 'app', '-t', 'electron-vite'])
    expect(result.exitCode).toBe(1)
    expect(await readFile(path.join(temporary, 'app', 'keep.txt'), 'utf8')).toBe('keep')
  })
})

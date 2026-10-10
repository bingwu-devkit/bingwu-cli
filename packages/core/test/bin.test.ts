import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { execa } from 'execa'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import packageJson from '../package.json' with { type: 'json' }
const cli = fileURLToPath(new URL('../dist/cli.mjs', import.meta.url))
let temporary: string
let file: string
let executableDirectory: string

beforeEach(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'bingwu-bin-test-'))
  file = path.join(temporary, 'config', 'templates.json')
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
  return execa(process.execPath, [cli, '--config', file, ...args], {
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
    const help = await run(['--help'])
    expect(help.exitCode).toBe(0)
    expect(help.stdout).toContain('create')
    const version = await run(['--version'])
    expect(version.exitCode).toBe(0)
    expect(version.stdout).toBe(packageJson.version)
    const list = await run(['list'])
    expect(list.exitCode).toBe(0)
    expect(list.stdout).toContain('electron-vite')
    expect(list.stdout).toContain('satnaing/shadcn-admin#main')
    expect(list.stdout).toContain('Whbbit1999/shadcn-vue-admin#main')
    expect(list.stdout).toContain('bingwu-devkit/starter-ts#main')
  })

  it('可通过真实子进程收藏、创建带空格的目录、透传参数并移除收藏', async () => {
    expect(
      (
        await run([
          'add',
          'cli',
          'create-vite',
          '--as',
          'vite',
          '--',
          '{projectDir}',
          '--template',
          'vue-ts',
        ])
      ).exitCode,
    ).toBe(0)
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
    expect((await run(['remove', 'vite'])).exitCode).toBe(0)
    expect((await run(['list'])).stdout).not.toContain('create-vite@latest')
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

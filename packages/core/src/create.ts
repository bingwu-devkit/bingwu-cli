import { lstat, mkdir, mkdtemp, readdir, rename, rm, rmdir } from 'node:fs/promises'
import path from 'node:path'

import { execa } from 'execa'
import { downloadTemplate } from 'giget'

import { errorMessage, UserError } from './errors.js'
import { templateSource } from './templates.js'
import type { Template } from './templates.js'

export interface CreateOptions {
  template: Template
  directory: string
  extraArgs: string[]
}

export type PnpmRunner = (args: string[], cwd: string) => Promise<void>

export interface CreateServices {
  download: (
    source: string,
    options: { dir: string; registry: false; force: false; forceClean: false },
  ) => Promise<unknown>
  run: PnpmRunner
}

export async function runPnpm(args: string[], cwd: string): Promise<void> {
  try {
    await execa('pnpm', args, { cwd, stdio: 'inherit', shell: false })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      throw new UserError('未找到 pnpm，请先安装 pnpm 并确认它在 PATH 中。')
    const signal = error instanceof Error && 'signal' in error ? error.signal : undefined
    const code =
      error instanceof Error && 'exitCode' in error && typeof error.exitCode === 'number'
        ? error.exitCode
        : 1
    const exitCode = signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : code
    throw new UserError(`pnpm ${args[0] ?? ''} 执行失败（退出码 ${exitCode}）。`, exitCode || 1)
  }
}

async function targetExists(directory: string): Promise<boolean> {
  try {
    const stat = await lstat(directory)
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new UserError(`目标必须是普通目录，不能是文件或符号链接：${directory}`)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false
    throw error
  }
}

async function assertAvailableTarget(directory: string): Promise<boolean> {
  const exists = await targetExists(directory)
  if (exists && (await readdir(directory)).length > 0)
    throw new UserError(`目标目录非空，请选择其他目录：${directory}`)
  return exists
}

async function assertGeneratedTarget(directory: string): Promise<void> {
  if (!(await targetExists(directory)) || (await readdir(directory)).length === 0) {
    throw new UserError(`创建工具未生成项目文件，可能已取消操作：${directory}`)
  }
}

export async function createProject(
  options: CreateOptions,
  services: Partial<CreateServices> = {},
): Promise<string> {
  const directory = path.resolve(options.directory)
  const { template, extraArgs } = options
  if (template.type === 'github' && extraArgs.length > 0)
    throw new UserError('GitHub 模板不接受第三方 CLI 的透传参数。')
  await assertAvailableTarget(directory)
  const parent = path.dirname(directory)
  await mkdir(parent, { recursive: true })
  if (template.type === 'cli') {
    const args = template.args.map((arg) =>
      arg.replaceAll('{projectDir}', path.basename(directory)),
    )
    await (services.run ?? runPnpm)(['dlx', template.package, ...args, ...extraArgs], parent)
    await assertGeneratedTarget(directory)
    return directory
  }

  const temporary = await mkdtemp(path.join(parent, '.bingwu-'))
  const staged = path.join(temporary, 'project')
  try {
    await (services.download ?? downloadTemplate)(`github:${templateSource(template)}`, {
      dir: staged,
      registry: false,
      force: false,
      forceClean: false,
    })
    await assertGeneratedTarget(staged)
    if (await assertAvailableTarget(directory)) await rmdir(directory)
    await rename(staged, directory)
    return directory
  } catch (error) {
    if (error instanceof UserError) throw error
    throw new UserError(`下载 ${template.repo} 失败：${errorMessage(error)}`)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

export async function installDependencies(directory: string): Promise<void> {
  await runPnpm(['install'], directory)
}

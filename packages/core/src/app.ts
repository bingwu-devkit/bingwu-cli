import { confirm, isCancel, select, text } from '@clack/prompts'
import { Command, CommanderError } from 'commander'

import packageJson from '../package.json' with { type: 'json' }
import { addTemplate, configPath, readConfig, removeTemplate } from './config.js'
import { createProject, installDependencies } from './create.js'
import { CancelledError, errorMessage, UserError } from './errors.js'
import { normalizeGithubRepo, normalizeNpmPackage, templateSource } from './templates.js'
import type { Template } from './templates.js'
import { nonEmptyStringSchema, parseWithSchema } from './validation.js'

const projectDirectorySchema = nonEmptyStringSchema('项目目录不能为空。')

interface AppServices {
  interactive: boolean
  chooseTemplate: (templates: Template[]) => Promise<string>
  chooseDirectory: () => Promise<string>
  chooseInstall: () => Promise<boolean>
  create: typeof createProject
  install: typeof installDependencies
  write: (message: string) => void
  error: (message: string) => void
}

function uncancel(value: string | symbol): string
function uncancel(value: boolean | symbol): boolean
function uncancel(value: string | boolean | symbol): string | boolean {
  if (isCancel(value) || typeof value === 'symbol') throw new CancelledError()
  return value
}

const defaultServices: AppServices = {
  interactive: process.stdin.isTTY && process.stdout.isTTY,
  chooseTemplate: async (templates) =>
    uncancel(
      await select({
        message: '选择项目模板',
        options: templates.map((template) => ({
          value: template.id,
          label: template.name,
          hint: `${template.id} · ${template.type}`,
        })),
      }),
    ),
  chooseDirectory: async () =>
    uncancel(
      await text({
        message: '项目目录',
        placeholder: 'my-app',
        validate: (value) =>
          projectDirectorySchema.safeParse(value).success ? undefined : '请输入项目目录。',
      }),
    ).trim(),
  chooseInstall: async () =>
    uncancel(await confirm({ message: '现在运行 pnpm install 安装依赖？', initialValue: false })),
  create: createProject,
  install: installDependencies,
  write: (message) => console.log(message),
  error: (message) => console.error(message),
}

interface CreateFlags {
  template?: string
  install?: boolean
}

interface AddFlags {
  as?: string
  name?: string
  ref?: string
  subdir?: string
}

export async function runCli(
  argv: string[],
  overrides: Partial<AppServices> = {},
): Promise<number> {
  const services = { ...defaultServices, ...overrides }
  const separator = argv.indexOf('--')
  const parsedArgs = separator === -1 ? argv : argv.slice(0, separator)
  const extraArgs = separator === -1 ? [] : argv.slice(separator + 1)
  const program = new Command()
    .name('bingwu')
    .description('收藏 GitHub 模板与第三方脚手架，快速创建项目')
    .version(packageJson.version)
    .option('--config <path>', '指定收藏配置文件')
    .exitOverride()
    .configureOutput({
      writeOut: (message) => services.write(message.trimEnd()),
      writeErr: (message) => services.error(message.trimEnd()),
    })

  const file = () => configPath(program.opts<{ config?: string }>().config)
  const rejectExtraArgs = () => {
    if (extraArgs.length) throw new UserError('只有 create 和 add cli 支持 -- 后的脚手架参数。')
  }
  const create = async (directory: string | undefined, flags: CreateFlags) => {
    const providedDirectory = directory?.trim()
    const config = await readConfig(file())
    if (!config.templates.length)
      throw new UserError('收藏清单为空，请先使用 bingwu add 添加模板。')
    if ((!providedDirectory || !flags.template) && !services.interactive)
      throw new UserError('非交互模式请使用 bingwu create <dir> --template <id>。')
    const id = flags.template ?? (await services.chooseTemplate(config.templates))
    const template = config.templates.find((item) => item.id === id)
    if (!template) throw new UserError(`未找到模板：${id}。使用 bingwu list 查看收藏。`)
    if (template.type === 'cli' && flags.install !== undefined)
      throw new UserError(
        '--install 和 --no-install 仅用于 GitHub 模板；第三方脚手架保留自身流程。',
      )
    const target = providedDirectory || (await services.chooseDirectory())
    parseWithSchema(projectDirectorySchema, target)
    services.write(`正在使用 ${template.name} 创建项目…`)
    const result = await services.create({ template, directory: target, extraArgs })
    services.write(`项目文件已创建：${result}`)
    if (template.type === 'github') {
      const shouldInstall =
        flags.install ?? (services.interactive ? await services.chooseInstall() : false)
      if (shouldInstall) await services.install(result)
      services.write(`进入该目录后运行：\n${shouldInstall ? '' : '  pnpm install\n'}  pnpm dev`)
    } else {
      services.write('后续步骤请按脚手架输出执行。')
    }
  }

  program.action(async () => create(undefined, {}))
  program
    .command('create [dir]')
    .description('使用收藏模板创建项目；-- 后的参数透传给脚手架')
    .option('-t, --template <id>', '模板 ID')
    .option('--install', 'GitHub 模板创建后安装依赖')
    .option('--no-install', 'GitHub 模板创建后跳过安装询问')
    .action(async (directory: string | undefined, flags: CreateFlags) => create(directory, flags))
  program
    .command('list')
    .description('查看收藏模板')
    .action(async () => {
      rejectExtraArgs()
      const { templates } = await readConfig(file())
      services.write(
        templates.length
          ? [
              'ID\t名称\t类型\t来源',
              ...templates.map(
                (template) =>
                  `${template.id}\t${template.name}\t${template.type}\t${templateSource(template)}`,
              ),
            ].join('\n')
          : '收藏清单为空。使用 bingwu add 添加模板。',
      )
    })
  const add = program.command('add').description('收藏 GitHub 仓库或 npm 脚手架')
  add
    .command('github <repo>')
    .description('收藏 owner/repo 或 GitHub 仓库地址')
    .option('--as <id>', '自定义模板 ID')
    .option('--name <name>', '显示名称')
    .option('--ref <ref>', '分支、标签或提交')
    .option('--subdir <path>', '仓库内的子目录')
    .action(async (input: string, flags: AddFlags) => {
      rejectExtraArgs()
      const repo = normalizeGithubRepo(input)
      const id = flags.as ?? repo.split('/')[1]!.toLowerCase()
      const template = await addTemplate(file(), {
        id,
        name: flags.name ?? id,
        type: 'github',
        repo,
        ...(flags.ref !== undefined ? { ref: flags.ref } : {}),
        ...(flags.subdir !== undefined ? { subdir: flags.subdir } : {}),
      })
      services.write(`已收藏 ${template.id}：${templateSource(template)}`)
    })
  add
    .command('cli <package>')
    .description('收藏 npm 脚手架；-- 后保存默认参数，默认使用 {projectDir}')
    .option('--as <id>', '自定义模板 ID')
    .option('--name <name>', '显示名称')
    .action(async (input: string, flags: AddFlags) => {
      const normalized = normalizeNpmPackage(input)
      const id = flags.as ?? normalized.id
      const template = await addTemplate(file(), {
        id,
        name: flags.name ?? id,
        type: 'cli',
        package: normalized.package,
        args: extraArgs.length ? extraArgs : ['{projectDir}'],
      })
      services.write(`已收藏 ${template.id}：${templateSource(template)}`)
    })
  program
    .command('remove <id>')
    .description('移除收藏（包括内置模板）')
    .action(async (id: string) => {
      rejectExtraArgs()
      await removeTemplate(file(), id)
      services.write(`已移除 ${id}。`)
    })
  program
    .command('config')
    .description('显示收藏配置文件路径')
    .action(() => {
      rejectExtraArgs()
      services.write(file())
    })

  try {
    await program.parseAsync(parsedArgs, { from: 'user' })
    return 0
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode
    services.error(`错误：${errorMessage(error)}`)
    return error instanceof UserError ? error.exitCode : 1
  }
}

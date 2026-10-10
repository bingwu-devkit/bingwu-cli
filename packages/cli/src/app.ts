import { confirm, isCancel, select, text } from '@clack/prompts'
import {
  createProject,
  errorMessage,
  installDependencies,
  loadTemplates,
  templateSource,
  UserError,
} from 'bingwu-core'
import type { Template } from 'bingwu-core'
import { Command, CommanderError } from 'commander'
import { z } from 'zod'

import packageJson from '../package.json' with { type: 'json' }
import { CancelledError } from './errors.js'

const projectDirectoryError = '项目目录不能为空。'
const projectDirectorySchema = z
  .string({ error: projectDirectoryError })
  .trim()
  .min(1, { error: projectDirectoryError })

interface AppServices {
  interactive: boolean
  loadTemplates: () => Promise<Template[]>
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
  loadTemplates: () => loadTemplates(),
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
    .description('从 GitHub 统一模板配置快速创建项目')
    .version(packageJson.version)
    .exitOverride()
    .configureOutput({
      writeOut: (message) => services.write(message.trimEnd()),
      writeErr: (message) => services.error(message.trimEnd()),
    })

  const rejectExtraArgs = () => {
    if (extraArgs.length) throw new UserError('只有 create 支持 -- 后的脚手架参数。')
  }
  const create = async (directory: string | undefined, flags: CreateFlags) => {
    const providedDirectory = directory?.trim()
    if ((!providedDirectory || !flags.template) && !services.interactive)
      throw new UserError('非交互模式请使用 bingwu create <dir> --template <id>。')
    const templates = await services.loadTemplates()
    if (!templates.length)
      throw new UserError('远程模板清单为空，请在 GitHub templates.json 中配置模板。')
    const id = flags.template ?? (await services.chooseTemplate(templates))
    const template = templates.find((item) => item.id === id)
    if (!template) throw new UserError(`未找到模板：${id}。使用 bingwu list 查看模板。`)
    if (template.type === 'cli' && flags.install !== undefined)
      throw new UserError(
        '--install 和 --no-install 仅用于 GitHub 模板；第三方脚手架保留自身流程。',
      )
    const target = providedDirectory || (await services.chooseDirectory())
    const validatedDirectory = projectDirectorySchema.safeParse(target)
    if (!validatedDirectory.success)
      throw new UserError(validatedDirectory.error.issues[0]!.message)
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
    .description('使用 GitHub 配置中的模板创建项目；-- 后的参数透传给脚手架')
    .option('-t, --template <id>', '模板 ID')
    .option('--install', 'GitHub 模板创建后安装依赖')
    .option('--no-install', 'GitHub 模板创建后跳过安装询问')
    .action(async (directory: string | undefined, flags: CreateFlags) => create(directory, flags))
  program
    .command('list')
    .description('查看 GitHub 配置中的模板')
    .action(async () => {
      rejectExtraArgs()
      const templates = await services.loadTemplates()
      services.write(
        templates.length
          ? [
              'ID\t名称\t类型\t来源',
              ...templates.map(
                (template) =>
                  `${template.id}\t${template.name}\t${template.type}\t${templateSource(template)}`,
              ),
            ].join('\n')
          : '远程模板清单为空，请在 GitHub templates.json 中配置模板。',
      )
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

import path from 'node:path'

import { z } from 'zod'

import { errorMessage, UserError } from './errors.js'
import { nonEmptyStringSchema, parseWithSchema } from './validation.js'

interface TemplateBase {
  id: string
  name: string
}

export interface GithubTemplate extends TemplateBase {
  type: 'github'
  repo: string
  ref?: string
  subdir?: string
}

export interface CliTemplate extends TemplateBase {
  type: 'cli'
  package: string
  args: string[]
}

export type Template = GithubTemplate | CliTemplate

export interface TemplateConfig {
  version: 1
  templates: Template[]
}

export const builtinTemplates: readonly Template[] = [
  {
    id: 'electron-vite',
    name: 'Electron Vite（官方交互）',
    type: 'cli',
    package: '@quick-start/create-electron@latest',
    args: ['{projectDir}'],
  },
  {
    id: 'shadcn-admin',
    name: 'Shadcn Admin',
    type: 'github',
    repo: 'satnaing/shadcn-admin',
    ref: 'main',
  },
]

const objectError = '配置和模板必须是 JSON 对象。'
const githubUrlError = '请提供 GitHub 仓库地址，例如 https://github.com/owner/repo。'
const githubRepoError =
  '仓库应为 owner/repo 或 GitHub 仓库地址；分支和子目录请分别使用 --ref 和 --subdir。'
const npmPackageError =
  '请提供 npm 包名，可包含 scope 和版本，例如 @quick-start/create-electron@latest。'
const argsError = 'CLI 模板的 args 必须是字符串数组。'

const idSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, {
  error: '模板 ID 只能包含小写字母、数字、点、横线和下划线，并以字母或数字开头。',
})
const stringFieldSchema = (field: string) => nonEmptyStringSchema(`${field} 必须是非空字符串。`)

const githubUrlSchema = z
  .instanceof(URL)
  .refine(
    (url) =>
      url.hostname === 'github.com' &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    { error: githubUrlError },
  )
const githubRepoSchema = z
  .string()
  .trim()
  .transform((input, ctx) => {
    let repo = input
    if (repo.startsWith('https://')) {
      let url: URL
      try {
        url = new URL(repo)
      } catch (error) {
        ctx.addIssue({ code: 'custom', message: errorMessage(error) })
        return z.NEVER
      }
      const result = githubUrlSchema.safeParse(url)
      if (!result.success) {
        ctx.addIssue({ code: 'custom', message: githubUrlError })
        return z.NEVER
      }
      repo = url.pathname.replace(/^\//, '').replace(/\/$/, '')
    }
    return repo.replace(/\.git$/, '')
  })
  .pipe(
    z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9_.-]+$/, { error: githubRepoError })
      .refine((repo) => !['.', '..'].includes(repo.split('/')[1]!), { error: githubRepoError }),
  )

const npmPackagePattern =
  /^(?<name>(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)(?:@(?<version>[^\s/:\\@]+))?$/
const npmPackageSchema = z
  .string()
  .trim()
  .regex(npmPackagePattern, { error: npmPackageError })
  .transform((input) => {
    const groups = npmPackagePattern.exec(input)!.groups!
    const name = groups.name!
    return { package: `${name}@${groups.version ?? 'latest'}`, id: name.split('/').at(-1)! }
  })

const baseShape = {
  id: stringFieldSchema('id').pipe(idSchema),
  name: stringFieldSchema('name'),
}
const githubTemplateSchema = z
  .object({
    ...baseShape,
    type: z.literal('github'),
    repo: stringFieldSchema('repo').pipe(githubRepoSchema),
    ref: stringFieldSchema('ref')
      .refine((ref) => !/[\s#?]/.test(ref), { error: 'ref 不能包含空白、# 或 ?。' })
      .optional(),
    subdir: stringFieldSchema('subdir')
      .refine(
        (subdir) =>
          !path.posix.isAbsolute(subdir) &&
          !/[\\#:]/.test(subdir) &&
          subdir.split('/').every((segment) => segment && segment !== '.' && segment !== '..'),
        { error: 'subdir 必须是仓库内的相对子目录，不能包含 ..。' },
      )
      .optional(),
  })
  .transform(({ ref, subdir, ...template }): GithubTemplate => ({
    ...template,
    ...(ref !== undefined ? { ref } : {}),
    ...(subdir !== undefined ? { subdir } : {}),
  }))
const cliTemplateSchema = z.object({
  ...baseShape,
  type: z.literal('cli'),
  // Preserve the existing priority of args errors over package errors.
  args: z.array(z.string({ error: argsError }), { error: argsError }),
  package: stringFieldSchema('package')
    .pipe(npmPackageSchema)
    .transform((normalized) => normalized.package),
})
// Validate common fields before selecting a template type, matching existing errors.
const templateSchema = z.looseObject(baseShape, { error: objectError }).pipe(
  z.discriminatedUnion('type', [githubTemplateSchema, cliTemplateSchema], {
    error: '模板 type 必须是 github 或 cli。',
  }),
)
const configSchema = z.object(
  {
    version: z.literal(1, { error: '不支持此配置版本，当前仅支持 version: 1。' }),
    templates: z.array(templateSchema, { error: 'templates 必须是数组。' }),
  },
  { error: objectError },
)

export function normalizeGithubRepo(input: string): string {
  return parseWithSchema(githubRepoSchema, input)
}

export function normalizeNpmPackage(input: string): { package: string; id: string } {
  return parseWithSchema(npmPackageSchema, input)
}

export function validateId(id: string): string {
  return parseWithSchema(idSchema, id)
}

export function parseTemplate(value: unknown): Template {
  return parseWithSchema(templateSchema, value)
}

export function parseConfig(value: unknown): TemplateConfig {
  const { templates } = parseWithSchema(configSchema, value)
  const ids = new Set<string>()
  for (const template of templates) {
    if (ids.has(template.id)) throw new UserError(`模板 ID 重复：${template.id}。`)
    ids.add(template.id)
  }
  return { version: 1, templates }
}

export function templateSource(template: Template): string {
  return template.type === 'cli'
    ? template.package
    : `${template.repo}${template.subdir ? `/${template.subdir}` : ''}${template.ref ? `#${template.ref}` : ''}`
}

import { randomUUID } from 'node:crypto'
import { link, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import envPaths from 'env-paths'

import { errorMessage, UserError } from './errors.js'
import { builtinTemplates, parseConfig, parseTemplate } from './templates.js'
import type { Template, TemplateConfig } from './templates.js'

export function configPath(customPath?: string): string {
  return customPath
    ? path.resolve(customPath)
    : path.join(envPaths('bingwu', { suffix: '' }).config, 'templates.json')
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code
}

export async function readConfig(file: string): Promise<TemplateConfig> {
  let content: string
  try {
    content = await readFile(file, 'utf8')
  } catch (error) {
    if (!hasCode(error, 'ENOENT'))
      throw new UserError(`无法读取配置 ${file}：${errorMessage(error)}`)
    const initial: TemplateConfig = {
      version: 1,
      templates: structuredClone([...builtinTemplates]),
    }
    try {
      await mkdir(path.dirname(file), { recursive: true })
      await writeConfig(file, initial, true)
      return initial
    } catch (writeError) {
      if (hasCode(writeError, 'EEXIST')) return readConfig(file)
      throw new UserError(`无法初始化配置 ${file}：${errorMessage(writeError)}`)
    }
  }
  try {
    return parseConfig(JSON.parse(content) as unknown)
  } catch (error) {
    throw new UserError(`配置无效 ${file}：${errorMessage(error)} 请修正该文件；原文件未被覆盖。`)
  }
}

async function writeConfig(
  file: string,
  config: TemplateConfig,
  initialize = false,
): Promise<void> {
  const temporary = path.join(path.dirname(file), `.bingwu-config-${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, { flag: 'wx' })
    if (initialize) await link(temporary, file)
    else await rename(temporary, file)
  } catch (error) {
    if (initialize && hasCode(error, 'EEXIST')) throw error
    throw new UserError(`无法保存配置 ${file}：${errorMessage(error)}`)
  } finally {
    await rm(temporary, { force: true })
  }
}

export async function addTemplate(file: string, value: Template): Promise<Template> {
  const template = parseTemplate(value)
  const config = await readConfig(file)
  if (config.templates.some((item) => item.id === template.id))
    throw new UserError(`模板 ${template.id} 已存在，请使用其他 --as ID。`)
  config.templates.push(template)
  await writeConfig(file, config)
  return template
}

export async function removeTemplate(file: string, id: string): Promise<void> {
  const config = await readConfig(file)
  const remaining = config.templates.filter((template) => template.id !== id)
  if (remaining.length === config.templates.length) throw new UserError(`未找到模板：${id}。`)
  config.templates = remaining
  await writeConfig(file, config)
}

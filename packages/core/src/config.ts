import { errorMessage, UserError } from './errors.js'
import { parseConfig } from './templates.js'
import type { Template } from './templates.js'

export const templateConfigUrl =
  'https://raw.githubusercontent.com/bingwu-devkit/bingwu-workspace/main/templates.json'

const requestTimeout = 15_000

export async function loadTemplates(fetchConfig: typeof fetch = fetch): Promise<Template[]> {
  let content: string
  try {
    const response = await fetchConfig(templateConfigUrl, {
      signal: AbortSignal.timeout(requestTimeout),
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    })
    if (!response.ok)
      throw new UserError(`无法获取模板配置 ${templateConfigUrl}：HTTP ${response.status}。`)
    content = await response.text()
  } catch (error) {
    if (error instanceof UserError) throw error
    const reason =
      error instanceof Error && error.name === 'TimeoutError'
        ? '请求超时（15 秒）'
        : errorMessage(error)
    throw new UserError(`无法获取模板配置 ${templateConfigUrl}：${reason}。请检查网络后重试。`)
  }
  try {
    return parseConfig(JSON.parse(content) as unknown).templates
  } catch (error) {
    throw new UserError(`远程模板配置无效 ${templateConfigUrl}：${errorMessage(error)}`)
  }
}

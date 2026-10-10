import { describe, expect, it } from 'vitest'

import { UserError } from '../src/errors.js'
import {
  normalizeGithubRepo,
  normalizeNpmPackage,
  parseConfig,
  parseTemplate,
  validateId,
} from '../src/templates.js'

const github = { id: 'example', name: 'Example', type: 'github', repo: 'owner/repo' }
const cli = { id: 'vite', name: 'Vite', type: 'cli', package: 'create-vite', args: [] }

describe('模板解析兼容性', () => {
  it('规范化 GitHub 字段，丢弃未知字段，且不修改输入', () => {
    const input = {
      id: ' example ',
      name: ' Example ',
      type: 'github',
      repo: ' https://github.com/owner/Repo.git/ ',
      ref: ' main ',
      subdir: ' examples/app ',
      extra: 'ignored',
    }
    const original = structuredClone(input)
    expect(parseTemplate(input)).toEqual({
      id: 'example',
      name: 'Example',
      type: 'github',
      repo: 'owner/Repo',
      ref: 'main',
      subdir: 'examples/app',
    })
    expect(input).toEqual(original)
  })

  it.each([{}, { ref: undefined, subdir: undefined }])(
    '不在返回值中添加未提供的可选字段：%j',
    (optional) => {
      const template = parseTemplate({ ...github, ...optional })
      expect(template).toEqual(github)
      expect(Object.hasOwn(template, 'ref')).toBe(false)
      expect(Object.hasOwn(template, 'subdir')).toBe(false)
    },
  )

  it('CLI 参数允许空字符串并保留空白、参数边界，包名缺省 latest', () => {
    const args = ['', ' two words ', '{projectDir}', '--flag']
    expect(
      parseTemplate({
        ...cli,
        id: ' vite ',
        name: ' Vite ',
        package: ' create-vite ',
        args,
        extra: 1,
      }),
    ).toEqual({ ...cli, package: 'create-vite@latest', args })
    expect(parseTemplate(cli)).toEqual({ ...cli, package: 'create-vite@latest' })
  })

  it.each([
    { value: null, message: '配置和模板必须是 JSON 对象。' },
    { value: [], message: '配置和模板必须是 JSON 对象。' },
    { value: 'template', message: '配置和模板必须是 JSON 对象。' },
    { value: {}, message: 'id 必须是非空字符串。' },
    { value: { ...github, id: ' ' }, message: 'id 必须是非空字符串。' },
    { value: { ...github, id: 1 }, message: 'id 必须是非空字符串。' },
    {
      value: { ...github, id: 'UPPER' },
      message: '模板 ID 只能包含小写字母、数字、点、横线和下划线，并以字母或数字开头。',
    },
    { value: { ...github, name: ' ' }, message: 'name 必须是非空字符串。' },
    { value: { ...github, name: false }, message: 'name 必须是非空字符串。' },
    { value: { ...github, type: 'other' }, message: '模板 type 必须是 github 或 cli。' },
    { value: { id: 'id', name: 'Name' }, message: '模板 type 必须是 github 或 cli。' },
    { value: { ...github, repo: '' }, message: 'repo 必须是非空字符串。' },
    { value: { ...github, repo: null }, message: 'repo 必须是非空字符串。' },
    { value: { ...github, ref: ' ' }, message: 'ref 必须是非空字符串。' },
    { value: { ...github, ref: null }, message: 'ref 必须是非空字符串。' },
    { value: { ...github, ref: 'two words' }, message: 'ref 不能包含空白、# 或 ?。' },
    { value: { ...github, ref: 'main#hash' }, message: 'ref 不能包含空白、# 或 ?。' },
    { value: { ...github, ref: 'main?query' }, message: 'ref 不能包含空白、# 或 ?。' },
    { value: { ...github, subdir: '' }, message: 'subdir 必须是非空字符串。' },
    { value: { ...github, subdir: null }, message: 'subdir 必须是非空字符串。' },
    { value: { ...cli, args: undefined }, message: 'CLI 模板的 args 必须是字符串数组。' },
    { value: { ...cli, args: '--flag' }, message: 'CLI 模板的 args 必须是字符串数组。' },
    { value: { ...cli, args: ['ok', 1] }, message: 'CLI 模板的 args 必须是字符串数组。' },
    { value: { ...cli, package: ' ' }, message: 'package 必须是非空字符串。' },
    { value: { ...cli, package: null }, message: 'package 必须是非空字符串。' },
  ])('保留中文校验错误：$message，输入：$value', ({ value, message }) => {
    expect(() => parseTemplate(value)).toThrow(new UserError(message))
  })

  it.each([
    { value: { type: 'other' }, message: 'id 必须是非空字符串。' },
    {
      value: { id: 'UPPER', name: '', type: 'other' },
      message: '模板 ID 只能包含小写字母、数字、点、横线和下划线，并以字母或数字开头。',
    },
    { value: { id: 'valid', name: '', type: 'other' }, message: 'name 必须是非空字符串。' },
    { value: { ...github, repo: '', ref: '' }, message: 'repo 必须是非空字符串。' },
    {
      value: { ...github, ref: 'bad ref', subdir: '../outside' },
      message: 'ref 不能包含空白、# 或 ?。',
    },
    {
      value: { ...cli, args: [1], package: '' },
      message: 'CLI 模板的 args 必须是字符串数组。',
    },
  ])('多字段无效时保留首个错误：$message', ({ value, message }) => {
    expect(() => parseTemplate(value)).toThrow(new UserError(message))
  })

  it.each([
    '../outside',
    '/absolute',
    'dir\\nested',
    'dir//nested',
    '.',
    '..',
    'dir/',
    'dir/./app',
    'dir#hash',
    'C:dir',
  ])('拒绝无效子目录：%s', (subdir) => {
    expect(() => parseTemplate({ ...github, subdir })).toThrow(
      new UserError('subdir 必须是仓库内的相对子目录，不能包含 ..。'),
    )
  })
})

describe('来源与 ID 规则兼容性', () => {
  it.each(['a', 'a.b_c-1', '0-template'])('允许有效 ID：%s', (id) => {
    expect(validateId(id)).toBe(id)
  })

  it.each(['', 'UPPER', '.id', '-id', '_id', 'two words', ' id '])('拒绝无效 ID：%s', (id) => {
    expect(() => validateId(id)).toThrow(
      new UserError('模板 ID 只能包含小写字母、数字、点、横线和下划线，并以字母或数字开头。'),
    )
  })

  it.each([
    [' owner/Repo.git ', 'owner/Repo'],
    ['https://github.com/owner/Repo.git/', 'owner/Repo'],
    ['https://github.com:443/owner/Repo', 'owner/Repo'],
  ])('规范化仓库 %s', (input, expected) => {
    expect(normalizeGithubRepo(input)).toBe(expected)
  })

  it.each([
    'https://gitlab.com/a/b',
    'https://github.com:8443/a/b',
    'https://user@github.com/a/b',
    'https://user:password@github.com/a/b',
    'https://github.com/a/b?query=1',
    'https://github.com/a/b#hash',
  ])('保留 URL 来源限制：%s', (input) => {
    expect(() => normalizeGithubRepo(input)).toThrow(
      new UserError('请提供 GitHub 仓库地址，例如 https://github.com/owner/repo。'),
    )
  })

  it.each([
    'http://github.com/a/b',
    'https://github.com/a/b/tree/main',
    'a/.',
    'a/..',
    '-owner/repo',
  ])('保留仓库格式限制：%s', (input) => {
    expect(() => normalizeGithubRepo(input)).toThrow(
      new UserError(
        '仓库应为 owner/repo 或 GitHub 仓库地址；分支和子目录请分别使用 --ref 和 --subdir。',
      ),
    )
  })

  it('保留畸形 URL 的错误提示', () => {
    expect(() => normalizeGithubRepo('https://')).toThrow('Invalid URL')
  })

  it.each([
    [' create-vite ', 'create-vite@latest', 'create-vite'],
    ['@scope/create-app', '@scope/create-app@latest', 'create-app'],
    ['create-vite@^7.0.0', 'create-vite@^7.0.0', 'create-vite'],
  ])('规范化 npm 包 %s', (input, pkg, id) => {
    expect(normalizeNpmPackage(input)).toEqual({ package: pkg, id })
  })

  it.each([
    '',
    'UPPER',
    '@scope',
    'pkg@',
    'pkg@two words',
    'pkg@file:../script',
    'pkg@a/b',
    'pkg@a\\b',
    'pkg@a@b',
  ])('保留 npm 包规则：%s', (input) => {
    expect(() => normalizeNpmPackage(input)).toThrow(
      new UserError(
        '请提供 npm 包名，可包含 scope 和版本，例如 @quick-start/create-electron@latest。',
      ),
    )
  })
})

describe('配置解析兼容性', () => {
  it('允许空列表并丢弃配置和模板的未知字段', () => {
    expect(parseConfig({ version: 1, templates: [], extra: true })).toEqual({
      version: 1,
      templates: [],
    })
    expect(
      parseConfig({ version: 1, templates: [{ ...github, extra: true }], extra: true }),
    ).toEqual({
      version: 1,
      templates: [github],
    })
  })

  it.each([
    { value: null, message: '配置和模板必须是 JSON 对象。' },
    { value: [], message: '配置和模板必须是 JSON 对象。' },
    {
      value: { version: 2, templates: null },
      message: '不支持此配置版本，当前仅支持 version: 1。',
    },
    {
      value: { version: '1', templates: [] },
      message: '不支持此配置版本，当前仅支持 version: 1。',
    },
    { value: { version: 1, templates: {} }, message: 'templates 必须是数组。' },
    { value: { version: 1 }, message: 'templates 必须是数组。' },
    { value: { version: 1, templates: [github, github] }, message: '模板 ID 重复：example。' },
    {
      value: { version: 1, templates: [github, { ...github, id: ' example ' }] },
      message: '模板 ID 重复：example。',
    },
    {
      value: { version: 1, templates: [github, github, { ...github, name: '' }] },
      message: 'name 必须是非空字符串。',
    },
    {
      value: {
        version: 1,
        templates: [
          { ...github, name: '' },
          { ...github, repo: 'https://' },
        ],
      },
      message: 'name 必须是非空字符串。',
    },
  ])('保留配置错误与先后顺序：$message', ({ value, message }) => {
    expect(() => parseConfig(value)).toThrow(new UserError(message))
  })
})

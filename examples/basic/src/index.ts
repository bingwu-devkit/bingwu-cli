import { builtinTemplates } from 'bingwu-core'

for (const template of builtinTemplates) {
  console.log(`${template.id}\t${template.name}\t${template.type}`)
}

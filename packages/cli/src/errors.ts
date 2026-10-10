import { UserError } from 'bingwu-core'

export class CancelledError extends UserError {
  constructor() {
    super('操作已取消。', 130)
    this.name = 'CancelledError'
  }
}

export class UserError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message)
    this.name = 'UserError'
  }
}

export class CancelledError extends UserError {
  constructor() {
    super('操作已取消。', 130)
    this.name = 'CancelledError'
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

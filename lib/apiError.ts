import 'server-only';

/**
 * 어느 단계에서 실패했는지 클라이언트 콘솔과 서버 로그에서 함께 식별할 수 있도록
 * 원인 메시지 대신 짧은 코드만 응답에 노출한다.
 */
export class StageError extends Error {
  constructor(public readonly reason: string, cause?: unknown) {
    super(reason, { cause });
    this.name = 'StageError';
  }
}

export const reasonOf = (error: unknown): string =>
  error instanceof StageError ? error.reason : 'unexpected_error';

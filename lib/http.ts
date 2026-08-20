/** 네트워크 요청이 응답 없이 매달려 UI를 무한 로딩으로 만들지 않도록 상한을 둔다. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export const fetchWithTimeout = async (
  input: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Request to ${input} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './http.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchWithTimeout', () => {
  it('returns the response when it arrives in time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok')));
    const response = await fetchWithTimeout('/api/scores', {}, 50);
    expect(response.ok).toBe(true);
  });

  it('rejects instead of hanging forever when the response never arrives', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: string, init: RequestInit = {}) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })));

    await expect(fetchWithTimeout('/api/scores', {}, 20)).rejects.toThrow('timed out after 20ms');
  });

  it('propagates the abort signal so the request is actually cancelled', async () => {
    const fetchMock = vi.fn((_input: string, init: RequestInit = {}) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithTimeout('/api/images', {}, 20)).rejects.toThrow();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });
});

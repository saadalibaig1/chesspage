import { api } from './api';

const serve = (body: string, status = 200) => {
  globalThis.fetch = (async () => new Response(body, { status })) as typeof fetch;
};

describe('api', () => {
  it('returns the JSON body', async () => {
    serve('{"rows":[]}');
    expect(await api('/board')).toEqual({ rows: [] });
  });

  it('throws the server’s error message', async () => {
    serve('{"error":"Sign in first."}', 401);
    await expect(api('/me')).rejects.toThrow('Sign in first.');
  });

  it('throws when the answer isn’t JSON, such as an HTML page', async () => {
    serve('<!doctype html><html></html>');
    await expect(api('/board')).rejects.toThrow('Something went wrong.');
  });
});

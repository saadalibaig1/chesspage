import { api, signInError } from './api';

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

describe('signInError', () => {
  it('says nothing when the player closes Google’s window', () => {
    expect(signInError('auth/popup-closed-by-user')).toBe('');
    expect(signInError('auth/cancelled-popup-request')).toBe('');
  });

  it('asks to allow pop-ups when the browser blocks the window', () => {
    expect(signInError('auth/popup-blocked')).toBe('Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.');
  });

  it('gives a short general message for anything else', () => {
    expect(signInError('auth/unauthorized-domain')).toBe('Sign-in isn’t available on this address yet.');
    expect(signInError('auth/network-request-failed')).toBe('No connection. Check your internet and try again.');
    expect(signInError('auth/internal-error')).toBe('Sign-in didn’t work. Please try again.');
  });
});

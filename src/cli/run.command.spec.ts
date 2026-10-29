import { resolve } from 'node:path';
import { resolveWorkspace } from './run.command';

describe('resolveWorkspace', () => {
  const cwd = '/home/user/projects/app';

  it('resolves a relative path against the given cwd', () => {
    expect(resolveWorkspace('../some-folder', cwd)).toBe('/home/user/projects/some-folder');
  });

  it('resolves "./sub" to an absolute path', () => {
    expect(resolveWorkspace('./sub', cwd)).toBe('/home/user/projects/app/sub');
  });

  it('keeps an absolute path absolute and normalized', () => {
    expect(resolveWorkspace('/tmp/ws/../ws', cwd)).toBe('/tmp/ws');
  });

  it('falls back to the cwd when no workspace is given', () => {
    expect(resolveWorkspace(undefined, cwd)).toBe(cwd);
  });

  it('falls back to the cwd for a blank workspace', () => {
    expect(resolveWorkspace('   ', cwd)).toBe(cwd);
  });

  it('defaults to process.cwd() when no cwd is passed', () => {
    expect(resolveWorkspace('.')).toBe(resolve(process.cwd()));
  });
});

import { describe, expect, it, vi } from 'vitest';

describe('Next.js API proxy rewrites', () => {
  it('does not proxy the frontend kiosk pages', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_API_PROXY', 'true');

    const config = (await import('../../next.config')).default;
    const rewrites = await config.rewrites!();
    const beforeFiles = typeof rewrites === 'object' && 'beforeFiles' in rewrites
      ? rewrites.beforeFiles
      : [];

    expect(beforeFiles).not.toContainEqual(expect.objectContaining({ source: '/kiosk/:path*' }));
    expect(beforeFiles).not.toContainEqual(expect.objectContaining({ source: '/kiosk/select' }));
    expect(beforeFiles).toContainEqual(expect.objectContaining({
      source: '/kiosk/verify-pin-for-user',
      destination: 'https://api.example.com/kiosk/verify-pin-for-user',
    }));
    expect(beforeFiles).toContainEqual(expect.objectContaining({
      source: '/classes',
      destination: 'https://api.example.com/classes/',
    }));
    expect(beforeFiles).toContainEqual(expect.objectContaining({
      source: '/class-types',
      destination: 'https://api.example.com/class-types/',
    }));
    expect(beforeFiles).toContainEqual(expect.objectContaining({
      source: '/terms/term-targets/',
      destination: 'https://api.example.com/terms/term-targets/',
    }));
    expect(beforeFiles).toContainEqual(expect.objectContaining({
      source: '/admin/invites',
      destination: 'https://api.example.com/admin/invites',
    }));
    expect(beforeFiles).toContainEqual(expect.objectContaining({
      source: '/admin/test-email',
      destination: 'https://api.example.com/admin/test-email',
    }));
    expect(beforeFiles).toContainEqual(expect.objectContaining({
      source: '/admin/users/:path*',
      destination: 'https://api.example.com/admin/users/:path*',
    }));
    expect(config.skipTrailingSlashRedirect).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { getPostLoginRoute } from '@/app/login/page';

describe('normal login destination', () => {
  it.each([
    ['Admin'],
    ['Teacher'],
    ['Student'],
  ])('opens the Student Portal for %s users', () => {
    expect(getPostLoginRoute()).toBe('/portal');
  });
});

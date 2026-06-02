import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  'apps/api',
  'apps/web',
]);

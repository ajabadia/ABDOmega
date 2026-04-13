import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [],
        include: ['tests/**/*.test.ts'],
    },
});
//# sourceMappingURL=vitest.config.js.map
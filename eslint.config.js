import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', 'dev/.next', 'dev/payload-types.ts', 'node_modules'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The CMS admin panel is not a production render target; a plain <img>
      // is intentional in the editor. Explicit-any is allowed in tests.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Tests exercise the plugin against loosely-typed fixture configs.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)

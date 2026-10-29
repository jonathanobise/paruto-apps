import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/*.generated.ts',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/.wrangler/**',
      'data/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { URL: 'readonly', console: 'readonly', process: 'readonly' } },
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='signTransaction']",
          message: 'Transaction signing is prohibited in this release (paper trading only).',
        },
        {
          selector: "CallExpression[callee.property.name='sendTransaction']",
          message: 'Broadcasting transactions is prohibited in this release (paper trading only).',
        },
        {
          selector: "CallExpression[callee.property.name='sendRawTransaction']",
          message: 'Broadcasting transactions is prohibited in this release (paper trading only).',
        },
      ],
    },
  },
);

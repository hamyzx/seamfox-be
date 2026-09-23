const eslintPluginPrettier = require('eslint-plugin-prettier');
const spellcheckPlugin = require('eslint-plugin-spellcheck');
const { plugin, parser } = require('typescript-eslint');

module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': plugin,
      prettier: eslintPluginPrettier,
      spellcheck: spellcheckPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: false }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      '@typescript-eslint/no-parameter-properties': 'off',

      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',

      'prettier/prettier': 'error',
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'max-len': ['error', { code: 200 }],
      'no-trailing-spaces': 'error',
      'object-shorthand': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      radix: 'error',

      'no-eval': 'error',
      'no-bitwise': 'error',
      'no-caller': 'error',
      'no-debugger': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'no-undef-init': 'error',
      'use-isnan': 'error',

      'no-console': ['error', { allow: ['warn', 'error'] }],

      'spellcheck/spell-checker': [
        'error',
        {
          comments: false,
          strings: true,
          identifiers: false,
          lang: 'en_US',
          skipWords: [
            'amazonaws',
            'otp',
            'enum',
            'varchar',
            'fcm',
            'otps',
            'idx',
            '308d06a9-aded-405c-853f-6daf12049ea1',
            'pdf',
            'Txn',
            'Helvetica',
            'unassign',
            'rewardRedemptions',
            'You’ve',
            'leaderboard',
            'Redemptions',
            'image/svg+xml',
            'whitespace',
            'visibilities'
          ],
        },
      ],
    },
  },
];

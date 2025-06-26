import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      eslintPluginPrettierRecommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
    ],
    files: ['**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
          singleQuote: true,
          trailingComma: 'all',
          arrowParens: 'always',
          bracketSpacing: true,
          bracketSameLine: false,
          semi: true,
          endOfLine: 'crlf',
          quoteProps: 'as-needed',
          embeddedLanguageFormatting: 'auto',
          proseWrap: 'preserve',
          htmlWhitespaceSensitivity: 'css',
          vueIndentScriptAndStyle: false,
          jsxSingleQuote: false,
          insertPragma: false,
          requirePragma: false,
        },
      ],
    },
  },
);

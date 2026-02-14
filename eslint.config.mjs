import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['main.js', 'dist/', 'node_modules/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: { obsidianmd },
    rules: {
      ...obsidianmd.configs.recommended,
      'obsidianmd/ui/sentence-case': [
        'error',
        {
          acronyms: ['SDF', 'SMARTS', 'MOL', 'SVG', 'CSV', 'SMILES', 'YAML', '2D'],
          brands: ['RDKit'],
        },
      ],
    },
  },
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);

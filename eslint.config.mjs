import tseslint from 'typescript-eslint';

const noLooseFunctions = [
  {
    selector: 'ExportNamedDeclaration > FunctionDeclaration',
    message: 'Logic must live in a class. Export a class with static methods instead.',
  },
  {
    selector: 'ExportNamedDeclaration VariableDeclarator > ArrowFunctionExpression',
    message: 'Logic must live in a class. Export a class with static methods instead.',
  },
  {
    selector: 'ExportNamedDeclaration VariableDeclarator > FunctionExpression',
    message: 'Logic must live in a class. Export a class with static methods instead.',
  },
];

const noDeclarationsOutsideOwnFiles = [
  {
    selector: 'TSInterfaceDeclaration',
    message: 'Declare interfaces in a dedicated *.types.ts file.',
  },
  {
    selector: 'TSTypeAliasDeclaration',
    message: 'Declare type aliases in a dedicated *.types.ts file.',
  },
  {
    selector: 'TSEnumDeclaration',
    message: 'Declare enums in a dedicated *.enum.ts file.',
  },
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/main.ts', 'src/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...noLooseFunctions],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/main.ts',
      'src/**/*.spec.ts',
      'src/**/*.types.ts',
      'src/**/*.enum.ts',
      'src/**/*.constants.ts',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...noLooseFunctions, ...noDeclarationsOutsideOwnFiles],
    },
  },
);

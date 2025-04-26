module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  env: { node: true, es2022: true },
  rules: {
    'prettier/prettier': ['error'],
    '@typescript-eslint/no-unused-vars': ['warn']
  }
};
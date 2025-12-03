import { configure } from '@japa/runner'

configure({
  files: ['tests/**/*.spec.ts'],
  timeout: 30000,
})

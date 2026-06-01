import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(currentDir, '..')
const serveCli = resolve(projectRoot, 'node_modules', 'serve', 'build', 'main.js')
const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000

const child = spawn(process.execPath, [serveCli, '-s', 'dist', '-l', String(port)], {
  cwd: projectRoot,
  stdio: 'inherit',
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})

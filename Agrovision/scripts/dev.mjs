import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const python = process.platform === 'win32' ? 'py' : 'python3'
const pythonArgs = process.platform === 'win32' ? ['-3.13', 'app.py'] : ['app.py']

const processes = [
  spawn('node', ['server/index.js'], { cwd: root, shell: true, stdio: 'inherit' }),
  spawn(npm, ['--prefix', 'client', 'run', 'dev'], { cwd: root, shell: true, stdio: 'inherit' }),
  spawn(python, pythonArgs, { cwd: join(root, 'ai_engine'), shell: true, stdio: 'inherit' }),
]

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of processes) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

for (const child of processes) {
  child.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) shutdown(code)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

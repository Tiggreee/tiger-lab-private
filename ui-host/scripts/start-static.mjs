import fs from 'node:fs'
import http from 'node:http'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(currentDir, '..')
const distRoot = resolve(projectRoot, 'dist')
const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
}

function routeToDistPath(urlPath) {
  if (urlPath === '/command-center' || urlPath === '/command-center/' || urlPath === '/command-center/index') {
    return 'command-center/index.html'
  }
  if (urlPath === '/project-map-3d' || urlPath === '/project-map-3d/') {
    return 'project-map-3d.html'
  }
  if (urlPath === '/project-map' || urlPath === '/project-map/') {
    return 'project-map.html'
  }
  if (urlPath === '/campaign-preview' || urlPath === '/campaign-preview/') {
    return 'command-center/campaign-preview.html'
  }

  const normalized = urlPath.replace(/^\/+/, '')
  if (!normalized) return 'index.html'
  return normalized
}

const server = http.createServer((req, res) => {
  const requestPath = new URL(req.url || '/', 'http://localhost').pathname
  const mappedPath = routeToDistPath(requestPath)

  let filePath = resolve(distRoot, mappedPath)
  if (!filePath.startsWith(distRoot)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Bad request')
    return
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Keep SPA fallback for routes that are not static pages.
    filePath = resolve(distRoot, 'index.html')
  }

  const ext = extname(filePath).toLowerCase()
  const type = contentTypes[ext] || 'application/octet-stream'
  const data = fs.readFileSync(filePath)
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
  })
  res.end(data)
})

server.listen(port, () => {
  console.log(`ui-host static server listening on http://localhost:${port}`)
})

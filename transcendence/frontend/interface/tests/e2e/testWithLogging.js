import { test as base, expect } from '@playwright/test'
import fs from 'node:fs'

const LOG_PATH = 'qa_debug_report.log'
let logStream

function ensureStream() {
  if (!logStream || logStream.destroyed) {
    try {
      logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' })
    } catch (e) {
      logStream = null
    }
  }
}

function writeLog(type, message, details = '') {
  const ts = new Date().toISOString()
  const entry = `[${ts}] [${type}] ${message}${details ? ' - ' + details : ''}\n`
  console.log(entry.trim())
  try {
    ensureStream()
    if (logStream && !logStream.destroyed) {
      logStream.write(entry)
    } else {
      fs.promises.appendFile(LOG_PATH, entry).catch(() => {})
    }
  } catch (e) {
    // swallow
  }
}

function attachListeners(page) {
  page.on('console', (msg) => {
    const t = msg.type()
    if (t === 'error' || t === 'warning') {
      const loc = msg.location ? msg.location() : {}
      const locStr = loc.url ? `${loc.url}:${loc.lineNumber || ''}` : ''
      writeLog(`console.${t}`, msg.text(), locStr)
    }
  })

  page.on('pageerror', (err) => {
    writeLog('pageerror', err.message || 'unhandled exception', err.stack || '')
  })

  page.on('requestfailed', (request) => {
    const failure = request.failure ? (request.failure().errorText || '') : ''
    writeLog('requestfailed', request.url(), `${request.method()} ${failure}`)
  })

  page.on('response', (response) => {
    const status = response.status()
    if (status >= 400) {
      writeLog('http_error', `${status} ${response.url()}`, `request=${response.request().method()}`)
    }
  })
}

base.beforeAll(() => {
  ensureStream()
  writeLog('info', 'QA debug logging started', `file=${LOG_PATH}`)
})

base.afterAll(() => {
  writeLog('info', 'QA debug logging ended')
  try {
    if (logStream && !logStream.destroyed) logStream.end()
  } catch {}
})

export const test = base.extend({
  page: async ({ page }, use) => {
    attachListeners(page)
    await use(page)
  },
})

export { expect }

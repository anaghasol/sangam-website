/**
 * Run JavaScript inside the user's REAL logged-in Chrome via AppleScript.
 *
 * Why: driving the everyday browser reuses its authenticated Toast session and
 * genuine fingerprint — no Puppeteer login, no fresh-profile risk scoring, and
 * far less Cloudflare exposure than automating a throwaway profile.
 *
 * Requires: Chrome → View → Developer → Allow JavaScript from Apple Events.
 * NOTE: if a stray Puppeteer-launched Chrome is running, AppleScript may target
 * IT instead of the real browser and report the setting as "turned off". Kill
 * stray instances (they run with --user-data-dir=/var/folders/...) first.
 *
 * The JS payload is base64-encoded so quotes/newlines survive the trip through
 * shell → AppleScript → Chrome. Async work is supported by stashing the result
 * on a window global and polling for it.
 */
'use strict'
const { execFile } = require('child_process')

const sleep = ms => new Promise(r => setTimeout(r, ms))

function osascript(script, timeout = 30000) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], { timeout, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message).trim()))
      resolve(stdout.replace(/\n$/, ''))
    })
  })
}

/** Find the tab id of the first tab whose URL contains `match`. */
async function findTab(match) {
  const s = `tell application "Google Chrome"
set out to ""
repeat with w in windows
repeat with t in tabs of w
if (URL of t) contains "${match}" then
set out to (id of t) as string
exit repeat
end if
end repeat
if out is not "" then exit repeat
end repeat
return out
end tell`
  const id = (await osascript(s)).trim()
  return id || null
}

/** Execute JS in a specific tab id, synchronously (last expression is returned). */
async function evalInTab(tabId, js) {
  const b64 = Buffer.from(js, 'utf8').toString('base64')
  const s = `tell application "Google Chrome"
repeat with w in windows
repeat with t in tabs of w
if ((id of t) as string) is "${tabId}" then
return execute t javascript "eval(decodeURIComponent(escape(atob(\\"${b64}\\"))))"
end if
end repeat
end repeat
return "TAB_NOT_FOUND"
end tell`
  return osascript(s)
}

/** Navigate a tab and wait for it to finish loading. */
async function navigate(tabId, url, waitMs = 9000) {
  const s = `tell application "Google Chrome"
repeat with w in windows
repeat with t in tabs of w
if ((id of t) as string) is "${tabId}" then
set URL of t to "${url}"
return "ok"
end if
end repeat
end repeat
return "TAB_NOT_FOUND"
end tell`
  const r = await osascript(s)
  await sleep(waitMs)
  return r
}

/**
 * Run async JS (returning a Promise) in a tab and wait for the result.
 * The payload stashes into window.__ce so we can poll for completion.
 */
async function evalAsync(tabId, asyncJs, { timeout = 90000, poll = 1500 } = {}) {
  const key = '__ce_' + Math.random().toString(36).slice(2, 8)
  const kick = `
    window.${key} = { done: false, value: null, error: null };
    (async () => {
      try { window.${key}.value = await (${asyncJs}); }
      catch (e) { window.${key}.error = String(e && e.message || e); }
      finally { window.${key}.done = true; }
    })();
    'started'
  `
  await evalInTab(tabId, kick)

  const dl = Date.now() + timeout
  while (Date.now() < dl) {
    await sleep(poll)
    const raw = await evalInTab(tabId, `
      (function(){
        var s = window.${key};
        if (!s) return 'MISSING';
        if (!s.done) return 'PENDING';
        return JSON.stringify({ error: s.error, value: s.value });
      })()
    `).catch(e => 'ERR:' + e.message)

    if (raw === 'PENDING') continue
    if (raw === 'MISSING') throw new Error('eval state lost (page navigated?)')
    if (raw.startsWith('ERR:')) throw new Error(raw)
    let parsed
    try { parsed = JSON.parse(raw) } catch { throw new Error('unparseable result: ' + raw.slice(0, 300)) }
    await evalInTab(tabId, `delete window.${key}; 'ok'`).catch(() => {})
    if (parsed.error) throw new Error(parsed.error)
    return parsed.value
  }
  throw new Error('evalAsync timed out after ' + timeout + 'ms')
}


/** Open a NEW tab (optionally at a url) and return its id. */
async function newTab(url = 'about:blank') {
  const s = `tell application "Google Chrome"
if (count of windows) is 0 then make new window
set t to make new tab at end of tabs of front window with properties {URL:"${url}"}
return (id of t) as string
end tell`
  return (await osascript(s)).trim()
}

/** Close a tab by id. */
async function closeTab(tabId) {
  const s = `tell application "Google Chrome"
repeat with w in windows
repeat with t in tabs of w
if ((id of t) as string) is "${tabId}" then
close t
return "ok"
end if
end repeat
end repeat
return "NOT_FOUND"
end tell`
  return osascript(s).catch(() => 'ERR')
}

/**
 * Ensure a tab is authenticated to Toast. Types TOAST_EMAIL/TOAST_PASSWORD into
 * the Auth0 form if we land logged out. Returns 'OK' | 'CLOUDFLARE' | 'FAILED'.
 * The real browser rarely gets challenged — that is the whole point of using it.
 */
async function ensureToastLogin(tabId, { timeout = 180000 } = {}) {
  const EMAIL = process.env.TOAST_EMAIL, PASS = process.env.TOAST_PASSWORD
  const dl = Date.now() + timeout
  while (Date.now() < dl) {
    const state = await evalInTab(tabId, `(/Just a moment|security verification/i.test(document.body.innerText)?'CLOUDFLARE':(location.href.indexOf('/login')>-1||location.href.indexOf('auth.toasttab.com')>-1?'LOGGED_OUT':'OK'))`).catch(() => 'ERR')
    if (state === 'OK') return 'OK'
    if (state === 'CLOUDFLARE') { await sleep(4000); continue }
    if (state === 'LOGGED_OUT' && EMAIL && PASS) {
      const did = await evalInTab(tabId, `
        (function(){
          var e=document.querySelector('input[name="username"],input[type="email"]');
          var p=document.querySelector('input[name="password"],input[type="password"]');
          function setV(el,v){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));}
          if(p){ setV(p, ${JSON.stringify(PASS)}); var b=document.querySelector('button[type=submit],button[name=action]'); if(b){b.click(); return 'PASS';} }
          if(e){ setV(e, ${JSON.stringify(EMAIL)}); var b2=document.querySelector('button[type=submit],button[name=action]'); if(b2){b2.click(); return 'EMAIL';} }
          var lg=[].slice.call(document.querySelectorAll('a,button')).find(function(x){return /^(log ?in|sign ?in|continue)$/i.test((x.innerText||'').trim())});
          if(lg){lg.click(); return 'SPLASH';}
          return 'NONE';
        })()
      `).catch(() => 'ERR')
      await sleep(did === 'NONE' ? 3000 : 5000)
      continue
    }
    await sleep(3000)
  }
  return 'FAILED'
}

module.exports = { osascript, findTab, newTab, closeTab, ensureToastLogin, evalInTab, evalAsync, navigate, sleep }

// CLI smoke test: node scripts/chrome-eval.js
if (require.main === module) {
  ;(async () => {
    const tab = await findTab('toasttab')
    console.log('toast tab id:', tab)
    if (!tab) return console.log('no toasttab tab open')
    console.log('url  :', await evalInTab(tab, 'location.href'))
    console.log('title:', await evalInTab(tab, 'document.title'))
    console.log('authed?', await evalInTab(tab, `(/Just a moment|security verification/i.test(document.body.innerText) ? 'CLOUDFLARE' : (location.href.indexOf('/login')>-1 ? 'LOGGED_OUT' : 'OK'))`))
  })().catch(e => console.error('FATAL', e.message))
}

#!/usr/bin/env node
/**
 * Queue a PetPooja item-level report and download it.
 *
 * The dashboard's "Export" is an async job: it writes a CSV to S3 and lists a
 * download link. The S3 object needs NO authentication and its name is fully
 * derivable from the date range, so only the QUEUEING needs the owner's
 * signed-in Chrome — the download works from anywhere, which is what makes a
 * scheduled pull possible later without this Mac.
 *
 *   node scripts/petpooja-export.js --start=2026-08-01 --end=2026-08-31
 */
'use strict'
const { newTab, closeTab, navigate, evalInTab, sleep } = require('./chrome-eval.js')
const fs = require('fs'), path = require('path')

const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1]
const START = arg('start'), END = arg('end')
if (!START || !END) { console.error('need --start=YYYY-MM-DD --end=YYYY-MM-DD'); process.exit(1) }

const ACCOUNT = process.env.PETPOOJA_ACCOUNT_ID || '98459'
const REPORT_URL = 'https://billing.petpooja.com/reports/order_summary_item'
const s3 = (s, e) =>
  `https://reportsfile-live.s3-ap-southeast-1.amazonaws.com/ordersummaryitem/${ACCOUNT}/Order_Summary_Item_Report_${ACCOUNT}_${s}_${e}.csv`

const OUT_DIR = path.join(__dirname, 'petpooja-exports')

// Set the range, select EVERY outlet, then press Export.
const QUEUE = (s, e) => `(function(){
  var sd=document.querySelector('input[name="data[Order][startdate]"]');
  var ed=document.querySelector('input[name="data[Order][enddate]"]');
  if(!sd||!ed)return 'no-date-inputs';
  sd.value='${s}'; ed.value='${e}';
  ['input','change'].forEach(function(ev){sd.dispatchEvent(new Event(ev,{bubbles:true}));ed.dispatchEvent(new Event(ev,{bubbles:true}))});
  var sel=document.querySelector('select[name="data[Order][search_wd][]"]');
  var n=0; if(sel){[].slice.call(sel.options).forEach(function(o){o.selected=true;n++});sel.dispatchEvent(new Event('change',{bubbles:true}))}
  var b=document.getElementById('order_searc1h'); if(!b)return 'no-export-button';
  b.click();
  return 'queued outlets='+n;
})()`

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const url = s3(START, END)
  const dest = path.join(OUT_DIR, `order_items_${START}_${END}.csv`)

  // Already generated on a previous run? Then no browser is needed at all.
  let head = await fetch(url, { method: 'HEAD' }).catch(() => null)
  if (!head || !head.ok) {
    console.log(`queueing ${START} → ${END} …`)
    const tab = await newTab('about:blank')
    try {
      await navigate(tab, REPORT_URL, 25000)
      await sleep(9000)
      console.log('  ' + await evalInTab(tab, QUEUE(START, END)))
      await sleep(10000)
    } finally { await closeTab(tab) }

    // PetPooja writes the file asynchronously; poll rather than guess a delay.
    for (let i = 1; i <= 30; i++) {
      head = await fetch(url, { method: 'HEAD' }).catch(() => null)
      if (head && head.ok) { console.log(`  ready after ${i * 10}s`); break }
      await sleep(10000)
    }
  } else {
    console.log('already generated — downloading directly (no browser needed)')
  }

  if (!head || !head.ok) { console.error(`FAILED: ${url} never appeared`); process.exit(1) }

  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
  const lines = buf.toString('utf8').split('\n').filter(Boolean).length - 1
  console.log(`✓ ${dest}  (${buf.length} bytes, ${lines} item rows)`)
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1) })

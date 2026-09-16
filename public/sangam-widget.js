;(function () {
  'use strict'
  if (window !== window.top) return // Prevent recursion inside iframe

  var script = document.currentScript || document.getElementsByTagName('script')[0]
  var baseUrl = (script && script.getAttribute('data-base-url')) || (window.location.origin)
  var primary = (script && script.getAttribute('data-primary')) || '#8a1f2b'
  var iframeSrc = baseUrl + '/embed/chat'

  if (window.__sangamWidget) return
  window.__sangamWidget = true

  // Inject CSS Styles for Bubble & Iframe
  var style = document.createElement('style')
  style.textContent = `
    #sgm-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
      width: 62px; height: 62px; border-radius: 50%;
      background: linear-gradient(135deg, #241510 0%, ${primary} 100%);
      box-shadow: 0 6px 24px rgba(36,21,16,0.36); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; border: 3px solid rgba(255,255,255,0.9); outline: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    #sgm-bubble:hover { transform: scale(1.08); }
    #sgm-frame-wrap {
      position: fixed; bottom: 96px; right: 24px; z-index: 2147483646;
      width: 390px; height: 82vh; max-height: 650px; border-radius: 20px;
      overflow: hidden; box-shadow: 0 12px 48px rgba(30,18,10,0.32);
      border: 1.5px solid rgba(199,154,58,0.4); transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #sgm-frame-wrap.sgm-hidden { opacity: 0; pointer-events: none; transform: scale(0.88) translateY(16px); }
    #sgm-frame-wrap.sgm-visible { opacity: 1; pointer-events: all; transform: scale(1) translateY(0); }
    #sgm-iframe { width: 100%; height: 100%; border: none; background: #fbf6ec; }
  `
  document.head.appendChild(style)

  // Create Bubble Button
  var bubble = document.createElement('button')
  bubble.id = 'sgm-bubble'
  bubble.setAttribute('aria-label', 'Open Sangam Chat Assistant')
  bubble.innerHTML = '🤖'

  // Create Frame Wrapper & Iframe
  var frameWrap = document.createElement('div')
  frameWrap.id = 'sgm-frame-wrap'
  frameWrap.className = 'sgm-hidden'
  var frame = document.createElement('iframe')
  frame.id = 'sgm-iframe'
  frame.src = iframeSrc
  frameWrap.appendChild(frame)

  var isOpen = false
  bubble.onclick = function () {
    isOpen = !isOpen
    frameWrap.className = isOpen ? 'sgm-visible' : 'sgm-hidden'
    bubble.innerHTML = isOpen ? '✕' : '🤖'
  }

  document.body.appendChild(bubble)
  document.body.appendChild(frameWrap)
})()

// ==UserScript==
// @name     Common
// @version  0.0.6
// @description Common function library. Should be required by other userscripts.
// ==/UserScript==
/* eslint no-unused-vars: ["off"] */

'use strict'

function dbg(x) {
  // unsafeWindow used solely for debugging in firefox via Web Console.
  if (typeof unsafeWindow === 'object') {
    unsafeWindow.console.log(x)
  }
  else {
    console.log(x)
  }
}

function htmlToElement(html) {
  const template = document.createElement('template')
  html = html.trim() // Never return a text node of whitespace as the result
  template.innerHTML = html
  return template.content.firstChild
}
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea')
  textArea.style.position = 'fixed'
  textArea.style.top = '50%'
  textArea.style.left = '50%'
  textArea.style.marginTop = '-10px'
  textArea.style.marginLeft = '-10px'
  textArea.style.width = '20px'
  textArea.style.height = '20px'
  textArea.style.opacity = '0'
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    const successful = document.execCommand('copy')
    const msg = successful ? 'successful' : 'unsuccessful'
    dbg(`Fallback: Copying text command was ${msg}`)
  }
  catch (err) {
    dbg('Fallback: Oops, unable to copy' ,err)
  }
  document.body.removeChild(textArea)
}
function copyTextToClipboard(text) {
  // First try to copy using the 2 GM methods..
  if (typeof GM === 'object' && typeof GM.setClipboard === 'function') {
    GM.setClipboard(text)
  }
  else if (typeof GM_setClipboard === 'function') {
    GM_setClipboard(text)
  }
  // Programmer failed to grant setClipboard permissions.
  // Attempt to use browser supported methods.
  else if (navigator && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      dbg('Async: Copying to clipboard was successful!')
    } ,(err) => {
      dbg('Async: Could not copy text: ' ,err)
    })
  }
  else {
    fallbackCopyTextToClipboard(text)
  }
}
/** ************************************************
 * XPath
 */

function getSnapshotByXpath(path ,node = document) {
  return document.evaluate(path.toString() ,node ,null ,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE ,null)
}
function getOrderedSnapshotByXpath(path ,node = document) {
  return document.evaluate(path.toString() ,node ,null ,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE ,null)
}
function getItterByXpath(path ,node = document) {
  return document.evaluate(path.toString() ,node ,null ,XPathResult.UNORDERED_NODE_ITERATOR_TYPE ,null)
}
function getOrderedItterByXpath(path ,node = document) {
  return document.evaluate(path.toString() ,node ,null ,XPathResult.ORDERED_NODE_ITERATOR_TYPE ,null)
}
function getElementByXpath(path ,node = document) {
  return document.evaluate(path.toString() ,node ,null ,XPathResult.FIRST_ORDERED_NODE_TYPE ,null).singleNodeValue
}

// Gets all values for provided keys via GM_getValue, defaulting to the provided default values.
// keys = {SomeGM_Key: SomeDefaultValue, AnotherGM_Key: AnotherDefaultValue}
// fn: function toRunAfterAllGM_getValues_prommisesHaveFinished({
//   SomeGM_Key: SomeValue,
//   AnotherGM_Key: AnotherValue
// })
function getUserValue(key ,defaultValue) {
  return new Promise((resolve ,reject) => {
    const jsonDefault = JSON.stringify(defaultValue)
    if (typeof GM === 'object' && typeof GM.getValue === 'function') {
      GM.getValue(key ,jsonDefault).then((value) => {
        resolve(JSON.parse(value))
      })
    }
    else if (typeof GM_getValue === 'function') {
      resolve(JSON.parse(GM_getValue(key ,jsonDefault)))
    }
    else {
      reject(new Error("To use 'getUserValue' you must grant either GM.getValue or GM_getValue."))
    }
  })
}
function getUserValues(keys) {
  const prommises = []
  Object.entries(keys).forEach(([key ,defaultValue]) => {
    prommises.push(
      getUserValue(key ,defaultValue).then((v) => {
        const obj = {}; obj[key] = v; return obj
      }) ,
    )
  })
  return Promise.all(prommises).then((itter) => {
    const newObj = {}
    for (const obj of itter) {
      Object.assign(newObj ,obj)
    }
    return newObj
  })
}

function setUserValue(key ,value) {
  return new Promise((resolve ,reject) => {
    if (typeof GM === 'object' && typeof GM.setValue === 'function') {
      GM.setValue(key ,JSON.stringify(value)).then(resolve).catch(reject)
    }
    else if (typeof GM_setValue === 'function') {
      GM_setValue(key ,JSON.stringify(value))
      resolve()
    }
    else {
      reject(Error("To use 'setUserValue' you must grant either GM.setValue or GM_setValue."))
    }
  })
}
function setUserValues(objs) {
  const prommises = []
  Object.entries(objs).forEach(([key ,value]) => {
    prommises.push(setUserValue(key ,value))
  })
  return Promise.all(prommises)
}

// Dont forget to also memorize the keycodes for emoji! We have the full UTF-8 spectrum to cover....
// But for now, lets memorize the word KEYCODES, end just try typing the name of the keys we want.
/* eslint object-property-newline: ["off", { "allowAllPropertiesOnSameLine": true }] */
/* eslint no-multi-spaces: ["off"] */
const KEYCODES = {
  'backspace': 8 ,'tab': 9 ,'enter': 13
  ,'shift': 16 ,'ctrl': 17 ,'alt': 18
  ,'pause_break': 19 ,'capslock': 20 ,'escape': 27
  ,'space': 32 ,'pageup': 33 ,'pagedown': 34
  ,'end': 35 ,'home': 36 ,'leftarrow': 37
  ,'uparrow': 38 ,'rightarrow': 39 ,'downarrow': 40
  ,'insert': 45 ,'delete': 46
  ,'0': 48 ,'1': 49 ,'2': 50 ,'3': 51
  ,'4': 52 ,'5': 53 ,'6': 54 ,'7': 55
  ,'8': 56 ,'9': 57 ,'a': 65 ,'b': 66
  ,'c': 67 ,'d': 68 ,'e': 69 ,'f': 70
  ,'g': 71 ,'h': 72 ,'i': 73 ,'j': 74
  ,'k': 75 ,'l': 76 ,'m': 77 ,'n': 78
  ,'o': 79 ,'p': 80 ,'q': 81 ,'r': 82
  ,'s': 83 ,'t': 84 ,'u': 85 ,'v': 86
  ,'w': 87 ,'x': 88 ,'y': 89 ,'z': 90
  ,'multiply': 106 ,'add': 107 ,'subtract': 109
  ,'decimalpoint': 110 ,'divide': 111
  ,'f1': 112 ,'f2': 113 ,'f3': 114
  ,'f4': 115 ,'f5': 116 ,'f6': 117
  ,'f7': 118 ,'f8': 119 ,'f9': 120
  ,'f10': 121 ,'f11': 122 ,'f12': 123
  ,'numlock': 144 ,'scrolllock': 145
  ,'semicolon': 186 ,'equalsign': 187
  ,'comma': 188 ,'dash': 189 ,'period': 190
  ,'forwardslash': 191 ,'graveaccent': 192
  ,'openbracket': 219 ,'backslash': 220
  ,'closebraket': 221 ,'singlequote': 222
}

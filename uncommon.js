// ==UserScript==
// @name     Mangadex Uncommon functions
// @version  0.0.7
// @description WARNING Should NOT be required by other userscripts. Lets be honest, no one else wants this crap. This is a personal library for personal problems. Requires common.js
// @require  https://cdn.rawgit.com/Brandon-Beck/Userscripts/master/common.js
// ==/UserScript==
/* eslint no-unused-vars: ["off"] */

'use strict'

/** ************************************************
 * XPath
 */

// NOTE: I do not promot the use of this xpath builder. It is used soly to make ways I commonly use xpaths easier.
// syntax will change. Do NOT depend on this. Do NOT use this. Do NOT think this is a good idea.
// TODO: small AST?
function XPath(xpathStr = '') {
  const xp = this
  if (!(xp instanceof XPath)) {
    return new XPath(xpathStr)
  }
  xp.xpath = xpathStr
  function toStr(o) {
    if (o instanceof XPath) {
      return o.toString()
    }

    return o
  }
  xp.new = newXpathStr => new XPath(newXpathStr)
  xp.clone = () => new XPath(xp.xpath)
  xp.contains = (attr ,text = throwMissingArg('XPath().contains(attr,text)' ,'text' ,'("@class","String")')) => {
    xp.xpath += `contains(concat(' ', normalize-space(${attr}), ' '), ' ${text} ')`
    return xp
  }
  xp.with = (selector) => {
    xp.xpath += `[${toStr(selector)}]`
    return xp
  }
  xp.append = (text) => {
    xp.xpath += text
    return xp
  }
  xp.and = (o = '') => {
    xp.xpath += ` and ${toStr(o)}`
    return xp
  }
  xp.or = (o = '') => {
    xp.xpath += ` or ${toStr(o)}`
    return xp
  }
  xp.toString = () => xp.xpath
  xp.getElement = (node = document) => getElementByXpath(xp ,node)
  xp.getSnapshot = (node = document) => getSnapshotByXpath(xp ,node)
  xp.getOrderedSnapshot = (node = document) => getOrderedSnapshotByXpath(xp ,node)
  xp.getItter = (node = document) => getItterByXpath(xp ,node)
  xp.getOrderedItter = (node = document) => getOrderedItterByXpath(xp ,node)
  xp.forEachElement = (fn ,node) => {
    for (let [i ,item] = [xp.getItter(node)]; (() => {
      item = i.iterateNext(); return item
    })();) {
      fn(item)
    }
  }
  xp.forEachOrderedElement = (fn ,node) => {
    for (let [i ,item] = [xp.getOrderedItter(node)]; (() => {
      item = i.iterateNext(); return item
    })();) {
      fn(item)
    }
  }
  return xp
}

class XPath2 {
  constructor(xpathStr) {
    this.xpath = xpathStr.toString()
  }

  static containsNormalizedAttr(attr ,text) {
    return `contains(concat(' ', normalize-space(${attr}), ' '), '${text}')`
  }

  static attrHasValue(attr ,text) {
    return XPath2.containsNormalizedAttr(attr ,` ${text} `)
  }

  static attrHasValueStartingWith(attr ,text) {
    return XPath2.containsNormalizedAttr(attr ,` ${text}`)
  }

  static attrHasValueEndingWith(attr ,text) {
    return XPath2.containsNormalizedAttr(attr ,`${text} `)
  }

  static containsClass(classes) {
    const classArr = (typeof classes === 'string') ? [classes] : classes
    return classArr.reduce((accum ,aClass) => `${accum.length > 0 ? `${accum} and ` : accum}${XPath2.attrHasValue('@class' ,aClass)}` ,'')
  }

  static contains(obj) {
    return Object.entries(obj).reduce(([attr ,origValues]) => {
      const values = (typeof origValues === 'object') ? origValues : [origValues]
      return values.reduce((accum ,value) => `${accum.length > 0 ? `${accum} and ` : accum}${XPath2.containsNormalized(attr ,value)}` ,'')
    })
  }
}


/** **************************************************************************
 *  Potentialy Usefull functions. Waiting till follows standard, or stablized.
 */

function throwMissingParam(name ,param ,example) {
  throw new Error(`Function <${name}> is missing required parameter: <${param}>${example ? ` eg. <${param}: ${example}>` : ''}`)
}
function throwMissingArg(name ,arg_name ,example) {
  throw new Error(`Function <${name}> is missing required argument: <${arg_name}>${example ? ` eg. <${example}>` : ''}`)
}
function throwOnBadParam(condition ,name ,param ,example ,bad_value) {
  if (condition) {
    throw new Error(`Function <${name}> has illegal value for required parameter: <${param}>${example ? ` exected: <${example}>` : ''}${bad_value ? ` got: <${bad_value}>` : ''}`)
  }
}
function throwOnBadArg(condition ,name ,arg_name ,example ,bad_value) {
  if (condition) {
    throw new Error(`Function <${name}> has illegal value for required argument: <${arg_name}>${example ? ` exected: <${example}>` : ''}${bad_value ? ` got: <${bad_value}>` : ''}`)
  }
}


/**
A promise I promise you dont have to write.
@param {Function} callback - Function we will call until passes filter
@param {Function} filter - Function we give the return value of callback to. should return true if we pass, false otherwise.
@param {Intager} tries - How many times we should try callback before giving up.
@param {Intager} delay - How long we should wait between callback calls.
@param {String} [name] - Name to use for debugging
@returns {Promise} Resolves when callback's return value passes the filter. Rejects when runs out of tries.
*/
function callUntilAccepted({
  callback = throwMissingParam('callUntilAccepted' ,'callback' ,'Function')
  ,filter = throwMissingParam('callUntilAccepted' ,'filter' ,'(ret) => { return ret === true; }')
  ,tries = throwMissingParam('callUntilAccepted' ,'tries' ,'20')
  ,delay = throwMissingParam('callUntilAccepted' ,'delay' ,'1000')
  ,name
}) {
  return new Promise((resolve ,reject) => {
    function checkLoop(triesLeft) {
      triesLeft--
      new Promise((resolve ,reject) => {
        const res = callback()
        if (filter(res)) {
          if (name) {
            dbg(`<${name}> passed the filter with ${triesLeft} tries remaining!`)
          }
          resolve(res)
        }
        reject(triesLeft)
      }).then(resolve).catch((triesLeft) => {
        if (triesLeft > 0) {
          setTimeout(() => {
            checkLoop(triesLeft)
          } ,delay)
        }
        else {
          if (name) {
            dbg(`<${name}> failed to pass the filter ${tries} times in ${delay}ms intervals. Giving up!`)
          }
          reject()
        }
      })
    }
    if (name) {
      dbg(`Now waiting for <${name}> to pass the filter!`)
    }
    checkLoop(tries)
  })
}
/**
A promise I promise you dont have to write.
@param {Function} callback - Function we will call until true
@param {Intager} tries - How many times we should try callback before giving up.
@param {Intager} delay - How long we should wait between callback calls.
@param {String} [name] - Name to use for debugging
@returns {Promise} Resolves when callback returns a true value. Rejects when runs out of tries.
*/
function callUntilTrue(args) {
  return callUntilAccepted({
    ...args ,filter: ret => ret === true
  })
}
/**
A promise I promise you dont have to write.
@param {Function} callback - Function we will call until true
@param {Intager} tries - How many times we should try callback before giving up.
@param {Intager} delay - How long we should wait between callback calls.
@param {String} [name] - Name to use for debugging
@returns {Promise} Resolves when callback returns a defined value. Rejects when runs out of tries.
*/
function callUntilDefined(args) {
  return callUntilAccepted({
    ...args ,filter: ret => (ret !== null && ret !== undefined)
  })
}
// Checks the page for {xpath} every {delay} milliseconds up to {tries} times. Runs {callback} once found.
// Used to wait for required elements to load before running functions.
// xpath: A String or XPath instance
// callback: Function to run once an xpath match is found
/**
Checks the page for {xpath} every {delay} milliseconds up to {tries} times.
@param {String} xpath - XPath we are trying to resolve
@param {Intager} tries - How many times we should try to find the xpath element before giving up.
@param {Intager} delay - How long we should wait between searches.
@param {String} [name] - Name to use for debugging
@returns {Promise} Resolves when xpath elemant is found. Rejects when runs out of tries.
*/
function waitForElementByXpath({
  xpath = throwMissingParam('checkLoop' ,'xpath' ,'"String"')
  ,tries = 50
  ,delay = 100
}) {
  return callUntilDefined({
    callback: () => getElementByXpath(xpath)
    ,tries
    ,name: `xpath <${xpath}>`
    ,delay
  })
}

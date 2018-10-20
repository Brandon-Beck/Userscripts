/* global throwMissingParam getUserValue setUserValue */
/* eslint no-unused-vars: ["off"] */
/* eslint no-return-assign: ["off"] */

'use strict'

/**
    @class SettingsTree
    @private
    @type {Object}
    @property {Object} obj -
    @property {Object} obj.value - Getter/Setter for value of all children.
    @property {Object} obj.allSavable - Getter/Setter for value of all children.
    Like obj.value, but builds a new JSON stringifyable object based on the
    current value. Used for saving/loading to/from JSON.
    @property {Object} obj.ownSavable - Like obj.allSavable, but doesn't
    descend on children with diffrent save methods.
    */

/**
    Setting Tree
    @prop {Object} obj -
    @prop {String} obj.key - Key to use for accessing this setting item in its parent's value list.
    @prop {Object} [obj.defer] - Accessor for parent SettingsTree methods. Used to inherit parrent settings when undefined for [saveLocation,saveMethod,loadMethod,autosave,autosaveDelay].
    @prop {String} [obj.defaultValue] - Initial value, does not trigger onchange/update_ui callbacks. Used by leaf nodes.
    @prop {Function} [obj.corrector] - Value Validationa and Correction callback. Called with the new value as the first parameter.
    Should return a valid value based off of the passed value, or null/undefined to use default value.
    If this throws an error, the value will not be set.
    You may wish to throw an error catch it in your ui code to display a message to the user
    @prop {Function} [obj.onchange] - Callback for when the UI changes the value.
    @prop {Function} [obj.updateUiCallback] - Callback for when the value is changed outside the UI.
    @prop {Boolean} [obj.autosave] - Should changes to this setting's value or it's children's value cause this setting group to save? If undefined, it will defer to its parrent tree, or false if it is a root node.
    @prop {String} [obj.saveLocation] - A seperate location to save this setting tree and its children.
    @prop {Function} [obj.saveMethod] - Method used for saving this tree. Called by autosave.
    @prop {Function} [obj.loadMethod] - Method used for loading this tree.
    */
function SettingsTree({
  key = throwMissingParam('new SettingsTree' ,'key' ,'\'a unique key to access this SettingsTree from its container\'')
  ,corrector
  ,onchange = () => null
  ,updateUiCallback = () => null
  ,defer
  ,autosave
  ,autosaveDelay
  ,defaultValue
  ,saveLocation
  ,saveMethod
  ,loadMethod
  ,isLeaf = false
}) {
  const stree = this
  if (!(stree instanceof SettingsTree)) {
    // Your getting an instance wether you like it or not!
    return new SettingsTree(...arguments)
  }
  // Expose tvariables we should be capable of directly altering later
  // stree.key=key;
  stree.autosave = autosave
  stree.autosaveDelay = autosaveDelay

  function defaultLoadMethod() {
    // FIXME: Autoload has a few small issues.
    // 1) we may autosave on load. shouldn't be a big deal, but deffinitly not ideal.
    // 2) we use stree.values, which can load over other save_locations if
    // a child moved save locations. this could cause loaded values from children
    // to be overwritten with old values from before structure change,
    // and then sequentialy be saved. This IS an issue.
    // For the time being, we are safe as long as we only use one save location,
    // or there are no parent save locations, or we dont change save locations.
    if (typeof saveLocation === 'string' && saveLocation.length > 0) {
      return getUserValue(saveLocation ,stree.ownSavable).then((obj) => {
        stree.value = obj
        return stree.value
      })
    }
    throw Error(`Attempted to load SettingsTree<${key}>, but no saveLocation was set!`)

    // FIXME Should we call onchange here? The user initiated this load, so its
    // possible for them to handle this on their own
    // plus we return a promise they can use as a oneoff onchange event.
  }
  function defaultSaveMethod() {
    if (typeof saveLocation === 'string' && saveLocation.length > 0) {
      return setUserValue(saveLocation ,stree.ownSavable)
    }
    throw Error(`Attempted to save SettingsTree<${key}>, but no saveLocation was set!`)
  }
  // Allow the child to utilize some of our functions/values when unspecified.

  const privateObject = {
    children: {}
    ,autosaveTimeout: undefined
    ,saveMethod
    ,loadMethod
    ,value: isLeaf ? defaultValue : {}
  }
  const privateMethods = {}

  Object.defineProperties(privateMethods ,{
    value: {
      get() {
        return privateObject.value
      }
      ,set(val) {
        privateObject.value = val
        return privateObject.value
      }
    }
  })
  const ourMethods = {}
  function getOrDefer(undeferedObject ,deferKey ,fallback) {
    if (undeferedObject[deferKey] != null) {
      return undeferedObject[deferKey]
    }
    if (typeof defer === 'object') {
      return defer[deferKey]
    }
    return fallback
  }
  function getStorageMethod(storageMethodKey ,defaultMethod) {
    // first try using a defined save method.
    if (typeof privateObject[storageMethodKey] === 'function') {
      return privateObject[storageMethodKey]
    }
    // Use the default save method on us if we save to a new location.
    if (saveLocation != null) {
      return defaultMethod
    }
    // If we are a child, defer to our parent node
    if (typeof defer === 'object') {
      return defer[storageMethodKey]
    }
    // We are a root node without a defined save method nor location.
    // There is no function we can/should return.
    // We wont log this as an error here, instead we do that when we try to call it.
    return defaultMethod
  }
  Object.defineProperties(ourMethods ,{
    autosave: {
      get() {
        return getOrDefer(stree ,'autosave' ,false)
      }
      ,set(val) {
        stree.autosave = val
      }
    }
    ,autosaveDelay: {
      get() {
        return getOrDefer(stree ,'autosaveDelay' ,500)
      }
      ,set(val) {
        stree.autosaveDelay = val
      }
    }
    ,autosaveTimeout: {
      get() {
        // We use the timeout of whoever ownes the save method.
        if (typeof privateObject.saveMethod === 'function') {
          return privateObject.autosaveTimeout
        }
        if (typeof defer === 'object') {
          return defer.autosaveTimeout
        }
        // There is no save method. One will be generated in this root
        // context, so return ours.
        return privateObject.autosaveTimeout
      }
      ,set(val) {
        // We use the timeout of whoever ownes the save method.
        if (typeof privateObject.saveMethod === 'function') {
          return privateObject.autosaveTimeout = val
        }
        if (typeof defer === 'object') {
          return defer.autosaveTimeout = val
        }
        // There is no save method. One will be generated in this root
        // context, so use ours.
        return privateObject.autosaveTimeout = val
      }
    }
    ,saveMethod: {
      get() {
        return getStorageMethod('saveMethod' ,defaultSaveMethod)
      }
      ,set(val) {
        privateObject.saveMethod = val
      }
    }
    ,loadMethod: {
      get() {
        return getStorageMethod('loadMethod' ,defaultLoadMethod)
      }
      ,set(val) {
        privateObject.loadMethod = val
      }
    }
  })
  // FIXME: Ugly patch to permit detecting same save method.
  stree.isSameMethod = (parentMethod ,checkKey) => parentMethod === ourMethods[checkKey]

  function autosaveMethod() {
    if (ourMethods.autosave) {
      clearTimeout(ourMethods.autosaveTimeout)
      if (typeof ourMethods.saveMethod === 'function') {
        ourMethods.autosaveTimeout = setTimeout(() => {
          ourMethods.saveMethod()
        } ,ourMethods.autosaveDelay)
      }
    }
  }
  // FIXME: Dont expose. instead, we should present this data the same way we present UI's accessors.
  stree.getMethodTree = (methodName) => {
    const methods = new Set([])
    if (typeof ourMethods[methodName] === 'function') {
      methods.add(ourMethods[methodName])
    }
    for (const [childKey ,child] of Object.entries(privateObject.children)) {
      child.getMethodTree().forEach((decendentMethod) => {
        methods.add(decendentMethod)
      })
    }
    return methods
  }
  stree.save = () => {
    if (typeof ourMethods.saveMethod === 'function') {
      return ourMethods.saveMethod()
    }
    return undefined
  }
  stree.load = () => {
    if (typeof ourMethods.loadMethod === 'function') {
      return ourMethods.loadMethod()
    }
    return undefined
  }
  stree.saveAll = () => {
    const methods = stree.getMethodTree('saveMethod')
    // dbg(`Found a total of ${save_methods.size} save methods`);
    methods.forEach((decendentMethod) => {
      decendentMethod()
    })
  }
  stree.loadAll = () => {
    const methods = stree.getMethodTree('loadMethod')
    // dbg(`Found a total of ${save_methods.size} save methods`);
    methods.forEach((decendentMethod) => {
      decendentMethod()
    })
  }

  // avoid duplicating code
  function setValueCommon({ accessors ,obj ,otherCallback ,myCallback ,allowAutosave = true }) {
    if (isLeaf) {
      if (typeof corrector === 'function') {
        let correctedObj
        try {
          correctedObj = corrector(obj)
        }
        catch (e) {
          dbg(`NOTE: Corrector for <${key}> threw the error <${e.message}>! If this was unintentional, review your code!`)
          throw e
        }
        if (correctedObj === obj) privateMethods.value = obj
        else {
          privateMethods.value = correctedObj
          // notify the setter as well.
          myCallback(privateMethods.value)
        }
      }
      else privateMethods.value = obj
      otherCallback(privateMethods.value)
    }
    else {
      for (const childKey of Reflect.ownKeys(obj)) {
        // TODO: Optionaly permit setting non-existant keys.
        // Could be used to auto-build settings ui
        // Or could be used for private/non-ui keys
        if (typeof privateObject.children[childKey] === 'object') {
          accessors[childKey] = obj[childKey]
        }
      }
    }
    if (allowAutosave) {
      autosaveMethod()
    }
  }
  // FIXME block adding new keys to value
  Object.defineProperties(stree ,{
    children: {
      get() {
        // return a copy of children, so we dont accidently try to assign new children..
        const lockedChildren = {}
        Object.assign(lockedChildren ,privateObject.children)
        Object.freeze(lockedChildren)
        return lockedChildren
      }
    }
    ,key: {
      get() {
        return key
      }
    }
    ,value: {
      get() {
        return privateMethods.value
      }
      ,set(val) {
        setValueCommon({
          accessors: stree.value
          ,obj: val
          ,otherCallback: updateUiCallback
          ,myCallback: onchange
        })
        return privateMethods.value
      }
      ,enumerable: true
    }
    // all savables, even ones that save in a diffrent location
    ,allSavable: {
      get() {
        if (isLeaf) {
          return privateMethods.value
        }
        const obj = {}
        for (const [childKey ,child] of Object.entries(privateObject.children)) {
          obj[childKey] = child.allSavable
        }
        return obj
      }
      // TODO Throw error on attempt to set to savable
    }
    // a savable with only keys set to be stored in the same saveLocation
    ,ownSavable: {
      get() {
        if (isLeaf) {
          return privateMethods.value
        }
        const obj = {}
        for (const [childKey ,child] of Object.entries(privateObject.children)) {
          // FIXME ugly patch to detect same save methods
          if (child.isSameMethod(ourMethods.saveMethod ,'saveMethod')) {
            obj[childKey] = child.ownSavable
          }
        }
        return obj
      }
      // TODO Throw error on attempt to set to savable
    }
    // NOTE quick access method for allSavable.
    // can't justify adding it.
    // Too ambiguous.
    /* savable: {
          get() { return stree.allSavable; },
        }, */
  })
  // Similar to this.value, but for the UI.
  // Not added to settings tree, passed directly to ui for privacy.
  const uiAccessor = { childrenAccessors: {} }
  Object.defineProperties(uiAccessor ,{
    value: {
      get() {
        if (isLeaf) {
          return privateMethods.value
        }

        return uiAccessor.childrenAccessors
      }
      ,set(val) {
        setValueCommon({
          accessors: uiAccessor.childrenAccessors
          ,obj: val
          ,otherCallback: onchange
          ,myCallback: updateUiCallback
        })
        return privateMethods.value
      }
    }
  })
  stree.updateUiCallback = updateUiCallback
  if (!isLeaf) {
    function attachChildToTree(childTree ,childUiAccessor) {
      privateObject.children[childTree.key] = childTree
      const desc = Reflect.getOwnPropertyDescriptor(childTree ,'value')
      Object.defineProperty(stree.value ,childTree.key ,desc)
      const uiDesc = Reflect.getOwnPropertyDescriptor(childUiAccessor ,'value')
      Object.defineProperty(uiAccessor.value ,childTree.key ,uiDesc)
      return [childTree ,childUiAccessor]
    }
    stree.createBranch = (args) => {
      const [childTree ,childUiAccessor] = new SettingsTree({
        defer: ourMethods
        ,...args
      })
      return attachChildToTree(childTree ,childUiAccessor)
    }
    stree.createLeaf = (args) => {
      const [childTree ,childUiAccessor] = new SettingsTree({
        // Defaults
        defer: ourMethods
        ,...args
        // Overrides
        ,isLeaf: true
      })
      return attachChildToTree(childTree ,childUiAccessor)
    }
  }
  Object.seal(stree)
  Object.seal(uiAccessor)
  return [stree ,uiAccessor]
}

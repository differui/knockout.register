import {
    extend,
    normalize,
    toPrimitive
} from './'

const invalidAttrNameRE = /^(?:data-[\w-]+|params|id|class|style)\b/i
const observableAttrNameRE = /^k-([\w\-]+)/i
const eventAttrNameRE = /^on-([\w\-]+)/i
const bindingProvider = new ko.bindingProvider() // eslint-disable-line

function pluckObservableBindingString (nodeName, nodeValue) {
  const result = nodeName.match(observableAttrNameRE)

  return result ? `${normalize(result[1])}:${nodeValue}` : ''
}

function pluckEventBindingString (nodeName, nodeValue) {
  const result = nodeName.match(eventAttrNameRE)

  return result ? `${normalize(result[0])}:${nodeValue}` : ''
}

function pluckObservableParams (bindingContext, bindingString) {
  return bindingProvider.parseBindingsString(bindingString, bindingContext)
}

function pluckEventParams (bindingContext, bindingString) {
  let i = 0
  let handlerParams
  let bindingError
  const bindingParents = ko.utils.makeArray(bindingContext.$parents)

  if (bindingParents.indexOf(bindingContext.$data) < 0) {
    bindingParents.unshift(bindingContext.$data)
  }

  bindingContext = { $data: null }

  while (bindingContext.$data = bindingParents[i]) { // eslint-disable-line
    i += 1

    try {
      handlerParams = bindingProvider.parseBindingsString(bindingString, bindingContext)
      bindingError = null
      break
    } catch (err) {
      bindingError = err
    }
  }

  if (bindingError) {
    throw bindingError
  }

  return handlerParams
}

export function pluck (node) {
  let bindingContext = null
  let observableBindingStringList = []
  let eventBindingStringList = []

  const result = ko.utils.makeArray(node.attributes).reduce((params, node) => {
    const nodeName = node.nodeName
    const nodeValue = node.nodeValue

    if (invalidAttrNameRE.test(nodeName)) {
      return params
    }

    if (observableAttrNameRE.test(nodeName)) {
      observableBindingStringList.push(pluckObservableBindingString(nodeName, nodeValue))
    } else if (eventAttrNameRE.test(nodeName)) {
      eventBindingStringList.push(pluckEventBindingString(nodeName, nodeValue))
    } else {
      params[normalize(nodeName)] = toPrimitive(nodeValue)
    }

    return params
  }, {})

  const eventBindingString = `{${eventBindingStringList.join(',')}}`
  const observableBindingString = `{${observableBindingStringList.join(',')}}`

  if (eventBindingString || observableBindingString) {
    bindingContext = ko.contextFor(node)
  }

  extend(result, eventBindingString && pluckEventParams(bindingContext, eventBindingString))
  extend(result, observableBindingString && pluckObservableParams(bindingContext, observableBindingString))

  return result
};

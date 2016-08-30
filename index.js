var path = require('path')
var fs = require('fs')

var loaderUtils = require('loader-utils')
var Promise = require('promise')

var importRegexp = /(.*)@(import|require)\s*["'](([./~]).*)["']\s*$/
var trailingSlashesRegexp = /\/$/
var leadingWhitespaceRegexp = /^([\t ]*)/
var newLineRegexp = /(?:\\r)?\\n/

module.exports = function(source) {
  var self = this
  if (self.cacheable) self.cacheable()
  var context = self.context
  var done = self.async()

  var flatSource = flattenStylus(source, context)
    .then(function (results) {
      results = addSourcefileComments(results, process.cwd(), self.resource, 'import')
      results = collapse(results) + "\\n\\n"
      output = results
      done(null, output)
    }).catch(function (err) {
      done(err)
    })

  function flattenStylus (source, baseDir) {
    source = source.replace(/\n/g, '\\n')
    var sourceLines = source.split(newLineRegexp)
    // if not import, end recursion
    if (!hasImport(sourceLines)) {
      return Promise.resolve(sourceLines)
    }

    return Promise.all(
      // For each line
      sourceLines.map(function(line, index) {
        line = normalizeWhiteSpace(line)
        var importStatement = line.match(importRegexp)
        // Check if it has an import
        if (importStatement) {
          var indent = normalizeWhiteSpace(importStatement[1])
          var type = importStatement[2]
          var importFilename
          // Asynchronously load import
          var importPath = importStatement[3]
          // should use webpack alias
          if (importStatement[4].match(/~/)) {
            importPath = importPath.replace(/^~/, '')
          }
          var newBaseDir
          return resolvePromise(baseDir, importPath)
            .then(function(filename) {
              importFilename = filename
              newBaseDir = path.dirname(filename)
              self.addDependency && self.addDependency(filename)
              return loadStylusFileAsModule(filename)
            })
            // Recursive call
            .then(function (source) {
              return flattenStylus(source, newBaseDir)
            })
            .then(removeEmptyLastLine)
            .then(function (source) {
              // return as array of strings, to replace the import
              source = addSourcefileComments(source, process.cwd(), importFilename, type)
              source = indentLines(source, indent.length)
              return source
            })
        } else {
          // Otherwise, map to a resolve with line
          // for Promise.all wrapper
          return Promise.resolve(line)
        }
      })
    )
  }

  function resolvePromise(context, request) {
    return new Promise(function (resolve, reject) {
      self.resolve(context, request, function(err, filename) {
        if (err) reject(err)
        resolve(filename)
      })
    })
  }

  function loadStylusFileAsModule(filepath) {
    return new Promise(function (resolve, reject) {
      self.loadModule("-!" + __dirname + "/stringify.loader.js!" + filepath, function(err, source) {
        if (err) reject(err)
        resolve(source)
      })
    }).then(stripQuotes)
    .catch(function(err) {
      console.log('load module promise err', err)
    })
  }
}

function hasImport(lines) {
  return lines.some(function(line) {
    return importRegexp.test(line)
  })
}

function removeEmptyLastLine(lines) {
  var whitespaceRegex = /^\s*$/
  if(whitespaceRegex.test(lines[lines.length -1])) {
    lines.pop()
    return lines
  }
  return lines
}

function addSourcefileComments(lines, cwd, filename, type) {
  filename = path.relative(cwd, filename)
  lines = ['/*!\\n * @' + type.toUpperCase() + ' START from: ' + filename + '\\n */'].concat(lines)
  lines.push('/*!\\n * @' + type.toUpperCase() + ' END from: ' + filename + '\\n */')
  return lines
}

function normalizeWhiteSpace(whitespace, initialTabSize) {
  whitespace = whitespace.replace(/\t/g, '  ')
  return whitespace
}

function indentLines (lines, indentSize) {
  var indent = Array(indentSize + 1).join(' ')
  return lines.map(function (line, index) {
    if (typeof line === 'string') {
      return indent + normalizeWhiteSpace(line)
    } else if (Array.isArray(line)) {
      return indentLines(line, indentSize)
    }
  })
}

function stripQuotes(string) {
  string = string.replace(/^["']/, '')
  return string.replace(/["']$/, '')
}

function collapse(lines) {
  var results = lines.map(function (line, index) {
    if (typeof line === 'string') {
      return line
    } else if (Array.isArray(line)) {
      return collapse(line)
    }
  }).join('\\n')
  return results
}
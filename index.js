const util = require('util')
const EE = require('eventemitter2').EventEmitter2
const EOL = require('os').EOL

/**
 * @param object options EventEmitter2 options https://github.com/asyncly/EventEmitter2
 */
function TCPEE(socket, options) {

  if(!(this instanceof TCPEE)) { return new TCPEE(options) }

  this.pending = []
  this.client = socket

  if (this.client) {
    this._hookEvents()
  }

  //eventemitter2 wants an error event to be registered
  this.on('error', function() {})

  EE.call(this, options)
}

util.inherits(TCPEE, EE)

TCPEE.prototype.send = function() {
  let args = [].slice.call(arguments)
  let callback = args.slice(-1)[0]
  let writeArgs

  if(typeof callback == 'function') {
    args.pop()
    writeArgs = [JSON.stringify(args) + EOL, callback]
  } else {
    writeArgs = [JSON.stringify(args) + EOL]
  }

  if (this.client && this.client.writable) {
    this.client.write.apply(this.client, writeArgs)
  } else {
    this.pending.push(writeArgs)
  }
}

TCPEE.prototype.ondata = function(d) {
  d.toString().split(EOL).map(data => {
    if (!data.length) { return }

    let args = JSON.parse(data)

    if (args[0] === '$TCPEE_EXIT') {
      this.exitCode = args[1]
      return
    }

    this.emit.apply(this, args)
  })
  return this
}

/**
 * Replicate the exit event and clean IPCEE events
 * @param integer code
 * @return void
 */
TCPEE.prototype.onclose = function() {
  this.emit('exit', this.exitCode)
}

TCPEE.prototype._hookEvents = function() {
  this.client.addListener('data', this.ondata.bind(this))
  this.client.addListener('close', this.onclose.bind(this))

  //send pending data
  if (this.pending.length) {
    let args
    while(args = this.pending.shift()) {
      this.client.write.apply(this.client, args)
    }
  }
}

module.exports = TCPEE

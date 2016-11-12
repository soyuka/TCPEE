const Socket = require('net').Socket
const socket = new Socket({allowHalfOpen: true})
const TCPEE = require('../../')

let interval
let t = new TCPEE(socket, {wildcard: true})

function connect() {
  socket.connect(`${__dirname}/../test.sock`)
}

socket.on('error', function(e) {
  if (e.code === 'ENOENT') {
    setTimeout(connect, 1000)
  }
})

socket.on('connect', function() {
  t.send('start')

  t.once('test', function(...args) {
    args.unshift('test')
    t.send.apply(t, args)
  })

  t.on('ping', function() {
   t.send('pong')
  })

  t.on('ping.me', function() {
   t.send('me.pong')
  })

  t.on('foo', function(...args) {
    args.unshift('foo')
    t.send.apply(t, args)
  })

  t.on('error', function() {
   throw new Error('Test')
  })
})

socket.on('end', function() {
  interval = setTimeout(connect, 1000)
})

connect()

process.on('uncaughtException', function(err) {
  t.send('error', err.toString(), err.stack)

  process.nextTick(e => process.exit(1))
})

process.on('exit', function(code) {
  t.send('$TCPEE_EXIT', code)

  process.nextTick(e => process.exit(code))
})

;['SIGTERM', 'SIGINT'].map(e => {
  process.on(e, process.exit)
})

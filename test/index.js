const fork = require('child_process').fork
const expect = require('chai').expect
const p = require('path')
const TCPEE = require('../index.js')
const Server = require('net').Server
const existsSync = require('@soyuka/exists-sync')
const SOCKET = `${__dirname}/test.sock`
const fs = require('fs')

let client, server, childProcess

describe('IPCEE', function() {

  before(function() {
    if (existsSync(SOCKET)) {
      fs.unlinkSync(SOCKET)
    }

    server = new Server()
    client = new TCPEE(null, {wildcard: true})
    server.listen(SOCKET)

    return new Promise((resolve, reject) => {
      server.on('connection', function(sock) {
        client.client = sock
        client._hookEvents()
      })

      server.once('listening', function() {
        resolve()
      })
    })
  })

  it('should fork server', function(cb) {
    client.once('start', cb)
    childProcess = fork(`${__dirname}/fixtures/answer.js`)
  })

  it('should get message through client', function(cb) {
    client.send('test', {foo: 'bar'}, [0,1,2])

    client.once('test', function(x, y) {
      expect(x).to.deep.equal({foo: 'bar'})
      expect(y).to.deep.equal([0,1,2])
      cb()
    })
  })

  it('should not be available because child has been killed', function(cb) {
    client.once('exit', function() {
      cb()
    })

    childProcess.kill('SIGINT')
  })

  it('should ping-pong', function(cb) {
    client.send('ping')
    client.once('pong', cb)

    childProcess = fork(`${__dirname}/fixtures/answer.js`)
  })

  it('should work with a callback', function(cb) {
    client.send('ping', cb)
  })

  it('should get error event', function(cb) {
    client.once('error', function(err, stack) {
      expect(err).to.equal('Error: Test')
      expect(stack).to.be.a.string

      client.once('exit', function() {
        return cb()
      })
    })

    client.send('error')
  })

  it('should work with wildcards', function(cb) {
    client.once('*.pong', function() {
      client.once('exit', cb)
      childProcess.kill('SIGINT')
    })

    client.send('ping.*')

    childProcess = fork(`${__dirname}/fixtures/answer.js`)
  })

  it('should send many pending data', function(cb) {
    client.send('foo', {bar: 'foo'})
    client.send('foo', ['bar', 'foo'])

    let i = 0

    client.on('foo', function(data) {
      if (i++ === 0) {
        expect(data).to.deep.equal({bar: 'foo'})
      } else {
        expect(data).to.deep.equal(['bar', 'foo'])
        cb()
      }
    })

    process.nextTick(e => {
      childProcess = fork(`${__dirname}/fixtures/answer.js`)
    })
  })
})

# TCP EE [![Build Status](https://travis-ci.org/soyuka/TCPEE.svg?branch=master)](https://travis-ci.org/soyuka/TCPEE)

TCP version of [IPCEE](https://github.com/soyuka/IPCEE)

## What for?

This is a TCP wrapper that has the same api as [IPCEE](https://github.com/soyuka/IPCEE). It's a low level API to interact with a socket by using `send()` and an event listener.

> Wait, why isn't IPC sufficient?

Well, in some cases, you want your child process to be independent. IPC requires a link between master and child to be established. If your master dies, your child dies too. Sure, you could set `detached: true` and the child won't die, but communications won't be possible through IPC because the link has been broken.

As this is a low level library, you have to handle the server/socket connections. For a higher level api, consider [relieve-failsafe](https://github.com/soyuka/relieve-failsafe).

## Usage

### Master

```javascript
const Server = require('net').Server
const TCPEE = require('tcpee')

//Init the tcpee with null, the socket isn't connected yet
const tcpee = new TCPEE(null)

//it's possible to send data, which will be stored until the client is available
tcpee.send('take this', 'when you are online')

tcpee.on('start', function() {
  console.log('the child has started')
})

const server = new Server()
server.listen('tcpee.sock')

server.on('connection', function(sock) {
  //Because we've init the TCPEE module before, we need to set up things manually
  tcpee.client = sock
  //Hook events here, socket is writable
  tcpee._hookEvents()

  //Or just create the TCPEE here:
  let client = new TCPEE(sock)
})
```

### Client

```javascript
const Socket = require('net').Socket
const socket = new Socket({allowHalfOpen: true})
const TCPEE = require('tcpee')

let client = new TCPEE(socket)

socket.connect('tcpee.sock')

socket.on('connect', function() {
  client.send('start')
})

client.on('take this', function(data) {
  console.log(data) //outputs: when you are online
})

// you should always send back the error
process.on('uncaughtException', function(err) {
  client.send('error', err.toString(), err.stack)

  process.nextTick(e => process.exit(1))
})

// required to keep the same behavior as IPCEE in case of exit
process.on('exit', function(code) {
  client.send('$TCPEE_EXIT', code)

  process.nextTick(e => process.exit(code))
})
```

## API

```
/**
 * Constructor
 * @param socket - the socket to write/read to/from
 * @param options - eventemitter2 options
 */
new TCPEE(socket = null, {wildcard: true})

/**
 * @param key - the key you'll listen on
 * @param ...args
 */
tcpee.send('key', arg1, arg2)

/**
 * @param key
 * @param ...args data received
 */
tcpee.on('key', function(arg1, arg2) {
})
```

Apart from the `send` method, the api inherits the one of [EventEmitter2](https://github.com/asyncly/EventEmitter2).

### Licence

> The MIT License (MIT)
>
> Copyright (c) 2015 Antoine Bluchet
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.

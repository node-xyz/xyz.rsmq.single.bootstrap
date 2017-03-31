# xyz.rsmq.single.bootstrap
Redis Simple Message Queue bootstrap function for xyz

[![Build Status](https://travis-ci.org/node-xyz/xyz.rsmq.single.bootstrap.svg?branch=master)](https://travis-ci.org/node-xyz/xyz.rsmq.single.bootstrap) [![npm version](https://badge.fury.io/js/xyz.rsmq.single.bootstrap.svg)](https://badge.fury.io/js/xyz.rsmq.single.bootstrap)

---

# Description

This module integrates xyz-core with [RSMQ](https://github.com/mpneuried/rsmq-worker). It can be used for asynchronous messaging. It is highly flexible and can be added to any server in xyz. The beauty if this module is that the sender does not need to know about the receiver at all and works just as if it was sending a normal message. Let's see the big picture.

![RMSQ info](https://github.com/node-xyz/xyz.rsmq.single.bootstrap/blob/master/media/rsmq.info.png?raw=true)

The main operations of this bootstrap function can be summarized as follows:

- A middleware will be injected into a server's listen route. This middleware will prevent the message to be delivered immediately to the service layer (usually by blocking `_httpMessageEvent`). Instead it will send the message to a redis queue.
- The redis queue component will listen for new messages and will invoke the service layer when a new message arrives.

Let's see the same information in xyz's logs. If you run `worker.js` in test folder, you see:

```
____________________  TRANSPORT LAYER ____________________
Transport:
  outgoing middlewares:
    call.dispatch.mw [/CALL] || _httpExport[0]
    ping.dispatch.mw [/PING] || _httpExport[0]

  HTTPServer @ 3000 ::
    Middlewares:
    call.receive.mw [/CALL] || _sendHttpToRMSQueue[0]
    ping.receive.mw [/PING] || _pingEvent[0]

  UDPServer @ 3001 ::
    Middlewares:
    CALL_UDP.receive.mw [/CALL_UDP] || _sendUdpToRMSQueueU[0]
```

As you see, both `CALL` and `CALL_UDP` routes have been registered to send their messages to the queue using `_sendHttpToRMSQueue` and `_sendUdpToRMSQueueU`. We will discuss these tests in more depth in the following sections.

# Usage

First of all, you need to have the module installed.

```bash
$ npm install xyz.rsmq.single.bootstrap
```

and a redis server running

```bash
$ redis-server
```

Import the module and bootstrap your node with it.


```javascript
var XYZ = require('xyz-core')
const _xyzRsmq = require('xyz.rsmq.single.bootstrap')

let worker = new XYZ({...})

// remove the default `httpEvent` middleware.
// note that it will work without this line since we call  `end()` in `_sendToQueue`
worker.middlewares().transport.server('CALL')(worker.id().port).remove(0)

// bootstrap rsmq on HTTP server @ port 4000 and route 'call'
worker.bootstrap(_xyzRsmq, {
  qnmae: 'http_queue',
  serverId: {
    port: worker.id().port,
    route: 'CALL'
  }
})

// you can access the rsmq object using:
const rsmq = _xyzRsmq._rsmq

// register a dummy task
worker.register('/task/cpu', (payload) => {
  let num = 1
  for (let i = 1; i < 100; i++) {
    num = num * i
  }
  rsmq.size((err, size) => {
    console.log(`/task/cpu done. remaining tasks in queuq: ${size}`)
  })
})
```

And that's about it! If you send a message to `/task/cpu`, you see that it will be called on schedule using a Queue

> Obviously, since this is async messaging, there will be no `response` in the second argument of `.register()`. [This line of code will respond]() to it.

# Spec

`xyz.rsmq.single.bootstrap` returns a single function that can be used to bootstrap both udp and http routes and servers. See `client.ms.js` and `client.udp.js` in `/test` folder for more detail.

--

If the HTTP version is being used, the message will be responded to the caller with:

```javascript
response.end(JSON.stringify({message: `message added to queue at receiver [${xyz.id().netId}]`}))
```

--

Both the HTTP and UDP bootstrap functions can be configured using

```javascript
ms.bootstrap(xyzRsmq, config)
```

where `config` can be:

|    option   | default value   | description |
|:-----------:|-----------------|-------------|
| `config.rsmqConfig`        | see `util/constants.js` |      options passed to rsmq worker. see [this page](https://github.com/mpneuried/rsmq-worker)       |
| `config.qname`       | `xyz_rmsq`            |      name of the queue      |
| `config.serverId.route`    | 5000            |      name of the route in target server      |
| `config.serverId.port`    | `xyz.id().port`            |      port of the target server      |
| `config.mwIndex`    | 0            |     index to insert `sendToQueue()` mw into      |

# Test and Example

The test folder includes a full test where one `worker.js` will receive and enqueue messages from one `client.js` using HTTP and one `client.udp.js` using UDP.

You can run each node individually or run them all using `xyz-cli` using

```bash
xyz dev -c ./xyztestrc.json
```

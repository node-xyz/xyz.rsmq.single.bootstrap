const RSMQWorker = require('rsmq-worker')
const mergeRecursive = require('./util/util').mergeRecursive
const CONSTANTS = require('./util/constants')

let worker, logger
let route, port

let _sendHttpToRMSQueue = function (params, next, end, xyz) {
  // TODO: this should also work with UDP
  let response = params[1]
  // add the message to queue
  worker.send(JSON.stringify({
    body: params[2]
  }), (err) => {
    // close and responde to the http message
    if (response) {
      // double check if it is http
      response.end(JSON.stringify({message: `message added to queue at receiver [${xyz.id().netId}]`}))
    }

    // no middleware after this should work.
    end()
  })
}

function rsmqHttpBootstrap (xyz, config) {
  // TODO: add a config so that it will bind events for monitorin
  logger = xyz.logger

  // ----- Setup -----
  // extract and merge rsmq config
  let rsmqConfig = config.rsmqConfig
  rsmqConfig = mergeRecursive(CONSTANTS.defaultRsmqConfig, rsmqConfig)

  // name of the queue
  let qname = config.qname || CONSTANTS.qname

  // port and route to identify the server to inject the middleware
  // default port is the primary port (port of the first Transport)
  // default route is `CALL`
  route = config.serverId.route || CONSTANTS.route
  port = config.serverId.port || xyz.id().port

  // index to push the middleware
  // default is 0 (push)
  let mwIndex = config.mwIndex || CONSTANTS.mwIndex

  // ---- Init -----
  worker = new RSMQWorker(qname, rsmqConfig)

  // configure middlewares
  let _mw = xyz.middlewares().transport.server(route)(port)
  _mw.register(mwIndex, _sendHttpToRMSQueue)

  // start reading from the queue
  worker.on('message', (msg, next, id) => {
    // pass the message to service layer via event
    let _msg = JSON.parse(msg)
    let _payload = {
      userPayload: _msg.body.userPayload,
      senderNetId: _msg.body.senderNetId
      // receivedFrom: config.serverId
    }
    logger.debug(`XYZ-RSMQ :: passing message for ${_msg.body.service} up to service repository`)
    xyz.serviceRepository.transport.servers[xyz.id().port].emit(xyz.CONSTANTS.events.MESSAGE, {
      service: _msg.body.service,
      userPayload: _payload
    })

    // delete the message from queue
    worker.del(id)

    // go to next message ...
    next()
  })

  worker.start()
  logger.info(`RSMQ worker started listening on incomming route [${route}], port [${port}]`)
  module.exports._rsmq = worker
}

module.exports = rsmqHttpBootstrap

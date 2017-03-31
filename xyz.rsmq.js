const RSMQWorker = require('rsmq-worker')
const mergeRecursive = require('./util/util').mergeRecursive
const CONSTANTS = require('./util/constants')

let worker, logger
let route, port

let _sendToRMSQueue = function (xMessage, next, end, xyz) {
  let response = xMessage.response
  let message = xMessage.message
  // add the message to queue
  worker.send(JSON.stringify(message), (err) => {
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
  // TODO: add a config so that it will bind events for monitoring
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
  _mw.register(mwIndex, _sendToRMSQueue)

  // start reading from the queue
  worker.on('message', (msg, next, id) => {
    // pass the message to service layer via event
    let _msg = JSON.parse(msg)
    let xMessage = {message: _msg}
    logger.debug(`XYZ-RSMQ :: passing message for ${_msg} up to service repository`)
    xyz.serviceRepository.transport.servers[xyz.id().port].emit(xyz.CONSTANTS.events.MESSAGE, xMessage)

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

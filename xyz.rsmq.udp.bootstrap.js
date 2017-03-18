const RSMQWorker = require('rsmq-worker')
const mergeRecursive = require('./util/util').mergeRecursive
const CONSTANTS = require('./util/constants')

function rsmqUdpBootstrap (xyz, config) {
  let _sendUdpToRMSQueueU = function (params, next, end, xyz) {
    // TODO: this should also work with UDP
    // add the message to queue
    worker.send(JSON.stringify({
      body: params[0].json
    }), (err) => {
      // no middleware after this should work.
      end()
    })
  }

  let worker, logger
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
  let route, port
  route = config.serverId.route || CONSTANTS.route
  port = config.serverId.port || xyz.id().port

  // index to push the middleware
  // default is 0 (push)
  let mwIndex = config.mwIndex || CONSTANTS.mwIndex

  // ---- Init -----
  worker = new RSMQWorker(qname, rsmqConfig)

  // configure middlewares
  let _mw = xyz.middlewares().transport.server(route)(port)
  _mw.register(mwIndex, _sendUdpToRMSQueueU)

  // start reading from the queue
  worker.on('message', (msg, next, id) => {
    // pass the message to service layer via event
    let _msg = JSON.parse(msg)
    // what will be passed as data to function
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

module.exports = rsmqUdpBootstrap

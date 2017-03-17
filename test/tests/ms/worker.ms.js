var XYZ = require('xyz-core')
const fs = require('fs')
const _b = require('./../../../xyz.rsmq.single.bootstrap')

let worker = new XYZ({
  selfConf: {
    name: 'worker.ms',
    logLevel: 'verbose',
    seed: ['127.0.0.1:4000'],
    transport: [{type: 'HTTP', port: 3000}]
  },
  systemConf: {nodes: []}
})

// remove the default `httpEvent` middleware.
// note that it will work without this line since we call  `end()` in `_sendToQueue`
worker.middlewares().transport.server('CALL')(worker.id().port).remove(0)
worker.bootstrap(_b, {
  serverId: {port: worker.id().port, route: 'CALL'},
  mwIndex: 0
})
const rsmq = require('./../../../xyz.rsmq.single.bootstrap')._rsmq

worker.register('/task/cpu', (payload, response) => {
  let num = 1
  for (let i = 1; i < 100; i++) {
    num = num * i
  }
  rsmq.size((err, size) => {
    console.log(`/task/cpu done. remaining: ${size}`)
  })
  if (response) {
    response.jsonify(num)
  }
})

worker.register('/task/io', (payload, response) => {
  const MAX = 1000
  for (let i = 0; i <= MAX; i++) {
    fs.writeFile('./trash.txt', String(i), function (_i, err) {
      if (err) throw err
      else {
        if (_i === MAX) {
          rsmq.size((err, size) => {
            console.log(`/task/io done. remaining: ${size}`)
          })
          if (response) {
            response.jsonify('written')
          }
        }
      }
    }.bind(null, i))
  }
})

console.log(worker)

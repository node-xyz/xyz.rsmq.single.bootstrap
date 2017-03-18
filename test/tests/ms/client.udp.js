const XYZ = require('xyz-core')

let client = new XYZ({
  selfConf: {
    logLevel: 'verbose',
    name: 'client.udp.ms',
    transport: [{type: 'HTTP', port: 5000}]
  },
  systemConf: {nodes: ['127.0.0.1:3000', '127.0.0.1:4000']}
})

const _udpExport = require('xyz-core/src/Transport/Middlewares/call/udp.export.middleware')
client.registerClientRoute('CALL_UDP')
client.middlewares().transport.client('CALL_UDP').register(0, _udpExport)

setInterval(function () {
  client.call({servicePath: '/task/cpu', payload: 'udp message', route: 'CALL_UDP', redirect: true}, (err, body, response) => {
    console.log(err, body)
  })
}, 200)

console.log(client)

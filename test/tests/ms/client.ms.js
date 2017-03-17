const XYZ = require('xyz-core')

let client = new XYZ({
  selfConf: {
    logLevel: 'verbose',
    name: 'client.ms',
    transport: [{type: 'HTTP', port: 4000}]
  },
  systemConf: {nodes: []}
})

setInterval(function () {
  client.call({servicePath: '/task/cpu'}, (err, body, response) => {
    console.log(err, body)
  })
}, 2000)

console.log(client)

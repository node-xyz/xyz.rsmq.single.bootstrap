const XYZ = require('xyz-core')

let client = new XYZ({
  selfConf: {
    logLevel: 'verbose',
    name: 'client.ms',
    transport: [{type: 'HTTP', port: 4000}]
  },
  systemConf: {nodes: ['127.0.0.1:3000', '127.0.0.1:5000']}
})

setInterval(function () {
  client.call({servicePath: '/task/cpu'}, (err, body, response) => {
    console.log(err, body)
  })
}, 200)

console.log(client)
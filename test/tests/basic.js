const test = require('./../common').test
const expect = require('chai').expect
const _send = test.sendMessage
const TOTAL = require('./../common').TOTAL

let processes
let identifiers = []
let TESTER
let workerId, clientId

before(function (done) {
  this.timeout(20 * 1000)
  test.setUpTestEnv((p) => {
    processes = p
    identifiers = Object.keys(processes)
    workerId = identifiers[0]
    clientId = identifiers[1]
    TESTER = test.getTester()
    setTimeout(done, 10 * 1000)
  })
})

it('message rate', function (done) {
  _send('network', processes[workerId], (data) => {
    // 10 is expected
    expect(data.rcv).to.be.above(9)
    _send('network', processes[clientId], (data) => {
      expect(data.snd).to.be.above(4)
      done()
    })
  })
})

after(function () {
  for (let p in processes) {
    processes[p].kill()
  }
})

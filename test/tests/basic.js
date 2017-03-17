const test = require('./../common').test
const expect = require('chai').expect
const _send = test.sendMessage
const TOTAL = require('./../common').TOTAL

let processes
let identifiers = []
let TESTER

before(function (done) {
  test.setUpTestEnv((p) => {
    processes = p
    identifiers = Object.keys(processes)
    TESTER = test.getTester()
    done()
  })
})

it('load should be balanced', function (done) {
  // client: 50 msg/sec
  done()
})

after(function () {
  for (let p in processes) {
    processes[p].kill()
  }
})

const cluster = require('cluster')
const mqemitter = require('./libs/mqemitter-ipfs.js')
const crypto = require('crypto')


function startAedes (ipfs_host, ipfs_port, mqtt_port) {
  const port = mqtt_port || 1883
  let hmac = null;
  const aedes = require('aedes')({
    authenticate: (client, username, password, done) => {
      console.log("authenticated");
      hmac = crypto.createHmac('sha256', password).update(username).digest('hex');
      console.log(hmac);
      aedes.publish({ topic: 'aedes/hello/hmac', payload: hmac })
      done(null, true)
    },
    id: 'IPFS_BROKER',
    mq: mqemitter({
      host: ipfs_host, //'cluster.provider-2.prod.ewr1.akash.pub',
      port: ipfs_port  //'31105'
    })
  })
  const server = require('net').createServer(aedes.handle);

  server.listen(port, function () {
    console.log('Aedes listening on port:', port)
    aedes.publish({ topic: 'aedes/hello', payload: "I'm broker " + aedes.id })
  })

  aedes.on('subscribe', function (subscriptions, client) {
    console.log('MQTT client \x1b[32m' + (client ? client.id : client) +
            '\x1b[0m subscribed to topics: ' + subscriptions.map(s => s.topic).join('\n'), 'from broker', aedes.id)
  })

  aedes.on('unsubscribe', function (subscriptions, client) {
    console.log('MQTT client \x1b[32m' + (client ? client.id : client) +
            '\x1b[0m unsubscribed to topics: ' + subscriptions.join('\n'), 'from broker', aedes.id)
  })

  // fired when a client connects
  aedes.on('client', function (client) {
    console.log('Client Connected: \x1b[33m' + (client ? client.id : client) + '\x1b[0m', 'to broker', aedes.id)
  })

  // fired when a client disconnects
  aedes.on('clientDisconnect', function (client) {
    console.log('Client Disconnected: \x1b[31m' + (client ? client.id : client) + '\x1b[0m', 'to broker', aedes.id)
  })

  // fired when a message is published
  aedes.on('publish', async function (packet, client) {
    console.log('Client \x1b[31m' + (client ? client.id : 'BROKER_' + aedes.id) + '\x1b[0m has published', packet.payload.toString(), 'on', packet.topic, 'to broker', aedes.id)
  })
}

var args = process.argv

console.log(args);
startAedes(args[2], args[3], args[4]);

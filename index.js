const cluster = require('cluster')

const ipfs = require('ipfs')
const ipfsClient = require('ipfs-http-client')
const crypto = require('crypto')


ipfs_topic = null;
ipfs_encryption_key = null;
cipher = null;

const bridgeId = crypto.randomUUID();

const ipfs_client = ipfsClient.create({
  host: "localhost", port: "5001", protocol: 'http'
})

var hmac = null;
function startAedes (ipfs_host, ipfs_port, mqtt_port) {
  const port = mqtt_port || 1883
  let hmac = null;
  const aedes = require('aedes')({
    authenticate: (client, username, password, done) => {
      ipfs_topic = crypto.createHmac('sha256', password)
        .update(username)
        .digest('hex');

      ipfs_encryption_key =  crypto.createHmac('sha256', username)
        .update(password)
        .digest('hex');
      cipher = crypto.createCipher('aes192', ipfs_encryption_key);

      ipfs_client.pubsub.subscribe(ipfs_topic, function (msg) {
        console.log(`subscribed to ${ipfs_topic}`);
        //Message recieve from remote queue or current queue
        // if message received from remote queue -> publish it here
        // if message recieve from current queue -> ignore
        ipfs_message = JSON.parse(new TextDecoder("utf-8").decode(msg.data));
        console.log(ipfs_message.message.data);
        if (ipfs_message.bridgeId !== bridgeId) {
          console.log("Recieved message from peer broker");
          console.log("Informing current broker: " + ipfs_message.topic);
          console.log(ipfs_message.message.data);
          buffer = new TextDecoder("utf-8").decode(Buffer.from(ipfs_message.message.data));
          message = Buffer.from(buffer.split('.')[0]).toString('ascii');

          aedes.publish({topic: ipfs_message.topic, payload: Buffer.from(message, 'base64')});
        }
        console.log(new TextDecoder("utf-8").decode(msg.data));
      })

      console.log(ipfs_topic);
      console.log(ipfs_encryption_key);
      done(null, true)
    },
    id: 'IPFS_BROKER'
  });



  const server = require('net').createServer(aedes.handle);

  server.listen(port, function () {
    console.log('Aedes listening on port:', port)
    //aedes.publish({ topic: 'aedes/hello', payload: "I'm broker " + aedes.id })
  })

  aedes.on('subscribe', function (subscriptions, client) {
    console.log('MQTT client \x1b[32m' + (client ? client.id : client) +
            '\x1b[0m subscribed to topics: ' + subscriptions.map(s => s.topic).join('\n'), 'from broker',aedes.id)
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
    console.log('Client Disconnected: \x1b[31m' + (client ? client.id : client) + '\x1b[0m', 'to broker',aedes.id)
  })

  // fired when a message is published
  aedes.on('publish', async function (packet, client) {
    if (client == null) {
      console.log("Internal Message ... do not publish to IPFS");
    } else {
      base64_message = Buffer.from(packet.payload).toString('base64');
      hashed_base64_message = crypto.createHash('sha256').update(base64_message).digest('hex');
      signature = cipher.update(hashed_base64_message,  'utf8', 'hex');
      ipfs_signed_message = base64_message + "." + signature;

      packet = {
        topic: packet.topic,
        message: Buffer.from(ipfs_signed_message),
        bridgeId: bridgeId
      }
      // recieve the message and publsih it on ipfs pubsub ipfs_topic
      // ipfs_topic is constructed based on the username
      // and password using to authenticate to mqtt for simplicity,
      // a more sophisticated use case can be established
      ipfs_client.pubsub.publish(ipfs_topic, Buffer.from(JSON.stringify(packet)));
      //console.log('Client \x1b[31m' + (client ? client.id : 'BROKER_' + aedes.id) + '\x1b[0m has published', packet.payload.toString(), 'on', packet.topic, 'to broker', aedes.id)
    }
  })
}

var args = process.argv

console.log(args);
startAedes(args[2], args[3], args[4]);

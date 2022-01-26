const ipfsClient = require('ipfs-http-client')

// connect to ipfs daemon API server
const ipfs = ipfsClient.create({ host: 'cluster.provider-2.prod.ewr1.akash.pub', port: '31105', protocol: 'http' })

var pub = async function(arg) {
  //const topic = '1d62e95a50e44514eea28e16300f491f6b687a616002ccd5a72bed68448657fc'
  const topic = 'THIS_IS_TOPIC'
  const msg = Buffer.from(arg)
  //  await ipfs.pubsub.publish(topic, msg)

  // msg was broadcasted
  //console.log(`published to ${topic}`)

}

const receiveMsg =  (msg)  =>
  console.log(new TextDecoder("utf-8").decode(msg.data));


var sub = async function () {
  const topic = '3c9b44e572cdb9a23f14d51b10c4ab6c3e03adeaf134f3f9a2fbe004a269cd04'
  //const topic = 'THIS_IS_TOPIC'

  //const receiveMsg = (msg) => console.log(msg.data.toString())

  await ipfs.pubsub.subscribe(topic, receiveMsg)
  console.log(`subscribed to ${topic}`)
}


setInterval(pub, 1000, 'Here you go');

sub();

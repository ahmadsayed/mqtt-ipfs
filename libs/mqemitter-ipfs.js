const { Qlobber } = require('qlobber')
const assert = require('assert')
const fastparallel = require('fastparallel')
const ipfsClient = require('ipfs-http-client')
var inherits = require('inherits')
var MQEmitter = require('mqemitter')
const crypto = require('crypto')

// connect to ipfs daemon API server
var ipfs = null;

function MQEmitterIPFS (opts) {
  if (!(this instanceof MQEmitterIPFS)) {
    return new MQEmitterIPFS(opts)
  }

  const that = this
  opts = opts || {}
  var host = opts.host || 'cluster.provider-2.prod.ewr1.akash.pub'
  var port = opts.port || '31105'
  ipfs = ipfsClient.create({ host: host, port:  port, protocol: 'http' })
  MQEmitter.call(this, opts);

}

inherits(MQEmitterIPFS, MQEmitter)

;['emit', 'on', 'removeListener', 'close'].forEach(function (name) {
  MQEmitterIPFS.prototype['_' + name] = MQEmitterIPFS.prototype[name]
})


MQEmitterIPFS.prototype.on = function on (topic, cb, done) {
  this._on(topic, cb, done);

  ipfs.pubsub.subscribe(topic, function(msg) {
    console.log(topic);

  });
  console.log(`subscribed to ${topic}`)

  return this
}

inherits(MQEmitterIPFS, MQEmitter)
var auth_topic = null;
const broker_ipfs_id = crypto.randomUUID();

MQEmitterIPFS.prototype.emit = function emit (message, cb) {
  console.log(message);
  this._emit(message, cb);
  assert(message)

  cb = cb || noop

  if (this.closed) {
    return cb(new Error('mqemitter is closed'))
  }
  const topic = message.topic;//'fruit-of-the-day-546546456'
  console.log(JSON.stringify(message));
  message.broker_ipfs_id = broker_ipfs_id
  const msg = Buffer.from(JSON.stringify(message));
  if (message.topic === 'aedes/hello/hmac') {
    auth_topic = message.payload;
    console.log("I Found auth topic bitches " + auth_topic);
  }
  if (auth_topic !==  null ) {
    ipfs.pubsub.publish(auth_topic, msg, cb);
    ipfs.pubsub.subscribe(auth_topic, function(msg) {
      parsed = JSON.parse(new TextDecoder("utf-8").decode(msg.data));
      if (parsed.broker_ipfs_id == broker_ipfs_id) {
        console.log("ITS ME Dummy");
      } else {
        delete parsed.broker_ipfs_id
        parsed.payload = new Buffer(parsed.payload.data);
        this._emit(message, cb);
      }
    });
  }


  console.log('published to ${topic}')
  return this
}
MQEmitterIPFS.prototype.removeListener = function removeListener (topic, notify, done) {
  assert(topic)
  assert(notify)
  ipfs.pubsub.unsubscribe(topic);

  if (done) {
    setImmediate(done)
  }

  return this
}
MQEmitterIPFS.prototype.close = function close (cb) {
  this.closed = true
  setImmediate(cb)

  return this
}

function noop () { }

module.exports = MQEmitterIPFS

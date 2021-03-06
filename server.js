const Channel = require('./channel')
const usocket = require('uWebSockets.js')
const assert = require('assert')
const uid = require('nuid')
const {decode} = require('./utils')
  
module.exports = async (config,{actions},emit=x=>x) => {
  const {
    port,
    host='*',
    batchLength=500,
    batchTime=500,
    maxPayloadLength=128 * 1024 * 1024,
    ...appConfig
  } = config

  const sessions = new Map()

  const app = usocket.App(appConfig)

  assert(config.channels && config.channels.length,'requires at least one channel')

  const channels = config.channels.reduce((result,channel)=>{
    result.set(channel,Channel(config,{actions,sessions,app})(channel))
    return result
  },new Map())

  app.ws('/',{
    maxPayloadLength,
    open(ws,req){
      ws.id = uid.next()
      sessions.set(ws.id,ws)
      ws.subscribe(ws.id)
      emit('connect',ws.id)
    },
    message(ws,data,isBinary){
      try{
        if(data.byteLength === 0) return
        const [channel,...message] = decode(data)
        assert(channels.has(channel),'Bad Server Channel: ' + channel)
        channels.get(channel).call(ws,message)
      }catch(err){
        emit('error',err)
      }
    },
    close(ws,code,message){
      sessions.delete(ws.id)
      channels.forEach(channel=>{
        channel.deleteStream(ws.id)
      })
      emit('disconnect',ws.id)
    },
  }).any('/*',(res,req)=>{
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.end('ok')
  }).get('/*', (res, req) => {
    /* Wildcards - make sure to catch them last */
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.end('ok')
  })

  await new Promise((res,rej)=>{
    app.listen(host,port,x=>{
      if(x) return res(x)
      rej(new Error('Unable to listen on port ' + host +':'+ port))
    })
  })

  console.log('openservice-ws open',host+':'+port)

  function unsubscribe(channel,sessionid,topic){
    assert(channels.has(channel),'No channel: ' + channel)
    return channels.get(channel).unsubscribe(sessionid,topic)
  }

  function subscribe(channel,sessionid,topic){
    assert(channels.has(channel),'No channel: ' + channel)
    return channels.get(channel).subscribe(sessionid,topic)
  }

  function publish(channel,topic,args){
    assert(channels.has(channel),'No channel: ' + channel)
    return channels.get(channel).publish(topic,args)
  }

  function send(channel,sessionid,args){
    assert(channels.has(channel),'No channel: ' + channel)
    return channels.get(channel).send(sessionid,args)
  }

  function stream(channel,topic,args){
    // console.log('stream',channel,topic)
    assert(channels.has(channel),'No channel: ' + channel)
    return channels.get(channel).stream(topic,args)
  }

  return {
    publish,
    subscribe,
    unsubscribe,
    stream,
    send, 
  }

}

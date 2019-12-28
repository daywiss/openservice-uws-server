const Batch = require('./batch')
const usocket = require('uWebSockets.js')
const assert = require('assert')
const uid = require('nuid')
const Subscribe = require('./subscriptions')
const {decode} = require('./utils')
  
module.exports = async (config,{actions},emit=x=>x) => {
  const {
    port,
    host='*',
    batchLength=50,
    batchTime=500,
    maxPayloadLength=128 * 1024 * 1024,
    ...appConfig
  } = config

  const sessions = new Map()
  const subscriptions = Subscribe()

  const app = usocket.App(appConfig)

  assert(config.channels && config.channels.length,'requires at least one channel')

  app.ws('/',{
    maxPayloadLength,
    open(ws,req){
      ws.id = uid.next()
      sessions.set(ws.id,ws)
      subscriptions.join(ws.id,ws)
      ws.batch = Batch({batchLength,batchTime},ws)
      emit('connect',ws.id)
    },
    message(ws,data,isBinary){
      try{
        if(data.byteLength === 0) return
        const [channel,...message] = decode(data)
        assert(config.channels.includes(channel),'Bad Server Channel: ' + channel)
        callActions(ws,channel,message)
      }catch(err){
        emit('error',err)
      }
    },
    close(ws,code,message){
      sessions.delete(ws.id)
      subscriptions.remove(ws)
      ws.batch.destroy()
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

  console.log('openservice-uws-server started',host+':'+port)

  async function callActions(ws,channel,[id,action,args]){
    //we need to not run the action if we do not detect the
    //session existing, same on return data
    try{
      const result = await actions(ws.id,channel,action,args)
      if(!sessions.has(ws.id)) return
      return ws.batch.response(channel,id,result)
    }catch(err){
      if(!sessions.has(ws.id)) return
      return ws.batch.error(channel,id,err)
    }
  }

  function unsubscribe(topic,sessionid){
    assert(sessions.has(sessionid),'Sessionid does not exist')
    subscriptions.leave(topic,sessions.get(sessionid))
  }

  function subscribe(topic,sessionid){
    assert(sessions.has(sessionid),'Sessionid does not exist')
    subscriptions.join(topic,sessions.get(sessionid))
  }

  function publish(channel,topic,args){
    return subscriptions.publish(topic,ws=>{
      ws.batch.event(channel,args)
    })
  }

  function send(channel,sessionid,args){
    assert(sessions.has(sessionid),'Sessionid does not exist')
    sessions.get(sessionid).batch.event(channel,args)
  }

  function close(){
    return app.close()
  }

  return {
    publish,
    subscribe,
    unsubscribe,
    send, 
    close,
  }

}

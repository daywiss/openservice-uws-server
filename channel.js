const assert = require('assert')
const {encodeError,encodeResponse,encodeEvent} = require('./utils')
const Stream = require('./stream')

//namespace,channel,group
//connect to namespace, subscribe to channel and listen to topics
//namespace requires a session
//channels can be used internally for pub/sub
//channel must also be included in data.
//topics should go through channel
//ok so channels should always be sent on 

module.exports = (config, {actions,sessions,app}) => {
  assert(actions,'requires actions')
  assert(sessions,'requires sessions')
  const channels = new Map()

  return channel => {

    const streams = Stream(config,publish)

    async function call(ws,[id,action,args]){
      //we need to not run the action if we do not detect the 
      //session existing, same on return data
      return actions(ws.id,channel,action,args).then(result=>{
        if(!sessions.has(ws.id)) return
        return ws.send(encodeResponse(channel,id,result))
      }).catch(err=>{
        if(!sessions.has(ws.id)) return
        return ws.send(encodeError(channel,id,err))
      })
    }

    function publish(topic,args=[]){
      // console.log('publish',channel,topic)
      // if(sessions.size <= 0) return
      // assert(sessions.size,'cannot publish when no sockets are connected')
      // sessions.values().next().value.publish(topic,encodeEvent(channel,args))
      app.publish(topic, encodeEvent(channel,args))
    }

    function stream(topic,args=[]){
      // console.log('stream',channel,topic)
      streams.get(topic).write(args)
    }

    function deleteStream(topic){
      streams.delete(topic)
    }

    function subscribe(sessionid,topic){
      assert(sessions.has(sessionid),'No session')
      sessions.get(sessionid).subscribe(topic)
    }

    function unsubscribe(sessionid,topic){
      assert(sessions.has(sessionid),'No session')
      sessions.get(sessionid).unsubscribe(topic)
    }

    function send(sessionid,args=[]){
      assert(sessions.has(sessionid),'No session')
      sessions.get(sessionid).send(encodeEvent(channel,args))
    }

    return {
      publish,
      subscribe,
      unsubscribe,
      stream,
      call,
      send, 
      deleteStream,
    }
  }
}


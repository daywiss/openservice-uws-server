const assert = require('assert')
module.exports = (config)=>{
  const topics = new Map()

  function join(topic,ws){
    if(ws == null) return
    if(!topics.has(topic)){
      topics.set(topic,new Set())
    }
    const sub = topics.get(topic)
    sub.add(ws)
    return ws
  }
  function leave(topic,ws){
    if(ws == null) return
    if(!topics.has(topic)) return ws
    const sub = topics.get(topic)
    sub.delete(ws)
    return ws
  }

  function remove(ws){
    if(ws == null) return
    topics.forEach(set=>{
      set.delete(ws)
    })
  }

  function publish(topic,cb){
    if(!topics.has(topic)) return false
    assert(cb,'requires callback')
    const subs = topics.get(topic)
    subs.forEach(cb)
    return true
  }

  function get(topic){
    if(!topics.has(topic)) return []
    return [...topics.get(topic)]
  }

  return {
    join,
    leave,
    publish,
    get,
    remove,
  }
}


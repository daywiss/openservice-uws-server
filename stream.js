
const assert = require('assert')
const highland = require('highland')
module.exports = (config={},emit=x=>x) =>{
  const {batchTime=500,batchLength=500} = config

  const streams = new Map()

  function makeStream(id){
    const stream = highland()
    stream
    // .doto(args=>console.log(...args))
      .batchWithTimeOrCount(batchTime,batchLength)
      .map(data=>emit(id,data))
      .errors((err,push)=>{
        console.log(err)
        process.exit(1)
      })
      .resume()

    return stream
  }

  return {
    get(topic){
      if(streams.has(topic)) return streams.get(topic)
      const stream = makeStream(topic)
      streams.set(topic,stream)
      return stream
    }, 
    delete(topic){
      if(!streams.has(topic)) return
      const stream = streams.get(topic)
      stream.destroy()
      streams.delete(topic)
    }
  }
}

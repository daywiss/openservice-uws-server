const {encode,encodeError,encodeResponse,encodeEvent} = require('./utils')
const highland = require('highland')

module.exports = function Batch(config,ws){
  const {batchTime=500,batchLength=50} = config
  const stream = highland()

  stream
    .batchWithTimeOrCount(batchTime,batchLength)
    .map(encode)
    .map(data=>{
      return ws.send(data)
    })
    .resume()

  function destroy(){
    stream.destroy()
  }
  function event(...args){
    stream.write(encodeEvent(...args))
  }
  function error(...args){
    stream.write(encodeError(...args))
  }
  function response(...args){
    stream.write(encodeResponse(...args))
  }
  return {
    event,error,response,destroy,stream
  }
}

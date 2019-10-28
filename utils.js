exports.decode = function decode(message){
  return JSON.parse(Buffer.from(message))
}

exports.encode = function encode(data){
  return JSON.stringify(data)
}

exports.encodeError = function encodeError(channel,id,err){
  return exports.encode([channel,id,[err.message,err.stack]])
}

exports.encodeResponse = function encodeResponse(channel,id,result){
  return exports.encode([channel,id,null,result])
}

exports.encodeEvent = function encodeEvent(channel,data){
  return exports.encode([channel,null,null,data])
}



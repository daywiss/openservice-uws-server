const test = require('tape')
const usocket = require('uWebSockets.js')
const WS = require('ws')
const Server = require('./server')
const Client = require('ws-api-client')
const Events = require('events')
const lodash = require('lodash')


test('server',t=>{
  let channel,socketid,client,server
  const events = new Events()
  const port = 8832

  async function ChannelAction(session,channel,action,...args){
    console.log('action call',{session,action,args})
    if(action === 'error'){
      throw new Error('this error')
    }
    if(action === 'slow'){
      await new Promise(res=>setTimeout(res,500))
      console.log('returning slow')
      return true
    }
    return {session,action,args}
  }

  const config = {
    port,
    channels:['public','private','admin'],
  }

  t.test('init',async t=>{
    server = await Server(config,{actions:ChannelAction},(type,...args)=>{
      console.log(type,...args)
    }).catch(t.end)

    client = await Client(
      WS,
      { host:`ws://localhost:${port}`,...config},
      {},
      (...args)=>events.emit(...args)
    )

    t.ok(client)
    t.end()
  })
  t.test('call',async t=>{
    const result = await client.public.call('action','argument')
    socketid = result.session
    console.log(result)
    t.ok(result)
    t.end()
  })
  t.test('publish',async t=>{
    events.once('change',(channel,data)=>{
      // console.log(channel,data)
      t.equal(data.some.path,'test')
      t.end()
    })
    server.publish('public',socketid,[[['some','path'],'test']])
  })
  t.test('stream',async t=>{
    t.plan(10)
    events.once('change',(channel,data)=>{
      // console.log(data)
      Object.entries(data).forEach(([key,value],i)=>{
        t.equal(value,'test_' + i)
      })
      // console.log('stream',channel,data)
      // t.end()
    })
    lodash.times(10,i=>{
      server.stream('private',socketid,[[i],'test_' + i])
    })
  })  
  t.test('public stream',async t=>{
    const result = await client.private.call('action','argument')
    events.once('change',(channel,data)=>{
      // console.log(channel,data)
      t.ok(data)
      t.end()
    })
    lodash.times(10,i=>{
      server.stream('public',result.session,[[i],'test_' + i])
    })
  })  
  t.test('public subscribe',async t=>{
    server.subscribe('public',socketid,'test')
    t.end()
  })
  t.test('public publish',async t=>{
    events.once('change',(channel,data)=>{
      t.equal(data.some.path,'ok')
      t.end()
    })
    server.publish('public','test',[[['some','path'],'ok']])
  })
  t.test('stream 1',async t=>{
    events.once('change',(channel,data)=>{
      console.log(channel,data)
      t.end()
    })
    await server.subscribe('admin',socketid,'someuser')
    server.stream('admin','someuser',[['test'],'test'])

  })
  t.test('stream and disconnect',async t=>{
    client.public.call('slow').then(x=>{
      t.ok(x)
    })
    client.getWs().close()
    // await new Promise(res=>setTimeout(res,100))

    server.send('private',socketid,[['key'],lodash.uniqueId('value')])
    server.stream('private',socketid,[['key'],lodash.uniqueId('value')])
    server.publish('private',socketid,[['key'],lodash.uniqueId('value')])
    t.end()

  })

})



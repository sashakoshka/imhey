/*
  shim
  api handler
*/

"use strict"

const https = require('https')

let sessionID = ""

function setSessionID (id) {
  sessionID = id
}

function verifySessionID (id) {
  return id && id.length === 26 // this number is subject to change in da future
}

function apiReq (params = {}, dataCallback, errorCallback) {
  if (!sessionID) errorCallback(new Error("session id hasn't been set yet"))

  if (!errorCallback) {
    errorCallback = (err) => {
      console.error(err)
    }
  }
  
  let reqData = ""

  let begun = false
  for (const [key, value] of Object.entries(params)) {
    if (begun) reqData += '&'
    reqData += `${encodeURI(key)}=${encodeURI(value)}`
    begun = true
  }

  reqData = Buffer.from(reqData)

  const options = {
    hostname: "im.spacehey.com",
    port:   443,
    path:   "/api",
    method: "POST",
    headers: {
      "Content-Type":   "application/x-www-form-urlencoded; charset=UTF-8",
      "Content-Length": reqData.length,
      "Cookie":         `PHPSESSID=${sessionID}`
    }
  }

  const req = https.request(options, (res) => {
    let resData = Buffer.alloc(0)
    
    res.on("data", (data) => {
      resData = Buffer.concat([resData, data])
    })

    res.on("end", () => {
      if (res.statusCode === 200)
        dataCallback(JSON.parse(resData.toString()))
      else
        errorCallback(new Error(`server sent code ${res.code}`))
    })
  })

  req.on("error", errorCallback)

  req.write(reqData)
  req.end()
}

function getConversations (dataCallback, errorCallback) {
  apiReq ({
    action: "get_conversations"
  }, dataCallback, errorCallback)
}

function getMessages (user, lastTime, dataCallback, errorCallback) {
  apiReq ({
    action:    "get_messages",
    user:      user,
    last_time: lastTime
  }, dataCallback, errorCallback)

  //lastTime = Math.floor(Date.now() / 1000)
}

function sendMessage (user, content, dataCallback, errorCallback) {
  apiReq ({
    action:  "send_message",
    user:    user,
    content: content
  }, dataCallback, errorCallback)
}

module.exports = {
  setSessionID,
  verifySessionID,
  apiReq,
  getChats: getConversations,
  getMessages,
  sendMessage
}

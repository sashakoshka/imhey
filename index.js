"use strict"

const shim         = require("./shim"),
      ui           = require("./ui"),
      fs           = require("fs"),
      os           = require("os"),
      readlineSync = require("readline-sync"),
      childProcess = require("child_process")

const confDirPath  = `${os.homedir()}/.config/imhey`
const confFilePath = confDirPath + "/conf.json"
let conf = {
  notifyCmd: "notify-send",
  beepCmd: "beep"
}

function loadConf () {
  if (!fs.existsSync(confDirPath))
    fs.mkdirSync(confDirPath, { recursive: true })

  try {
    conf = {
      ... conf,
      ... JSON.parse(fs.readFileSync(confFilePath))
    }
  } catch (err) {
    console.error("(i) config file missing or broken, new one will be created")
  }
}

function saveConf () {
  fs.writeFileSync(confFilePath, JSON.stringify(conf))
}

loadConf()

if (!shim.verifySessionID(conf.phpsessid)) {
  console.error (
    "ERR session id not set, or invalid. please get your session id by",
    "following the instructions in README.md (in ## Setup)"
  )
}

while (!shim.verifySessionID(conf.phpsessid)) {
  conf.phpsessid = readlineSync.question("[?] please input your session id: ")
  if (shim.verifySessionID(conf.phpsessid)) {
    saveConf()
    break
  }
  console.error("ERR id is invalid, try again")
}

shim.setSessionID(conf.phpsessid)

let selection = 0

ui.init ({
  onselect: (item) => {
    selection = item
    let status = ui.addStatus("Loading...")
    refreshMessages (() => {
      ui.delStatus(status)
    }, true)
  },
  onsubmit: (message) => {
    send(message)
    ui.countDown(10)
  },
  onrefresh: () => {
    lockRefresh = true
    let status = ui.addStatus("Refreshing...")
    refreshChats(() => {
      refreshMessages(() => {
        ui.delStatus(status)
        lockRefresh = false
      })
    })
  }
})

let chats         = []
let chatHistories = {}
let lockRefresh   = false

function error (err) {
  ui.addMessage("API ERR", err)
  ui.forceRefresh()
}

function notify (message) {
  if (conf.notifyCmd) childProcess.spawn(conf.notifyCmd, [message])
}

function beep () {
  if (conf.beepCmd) childProcess.spawn(conf.beepCmd)
}

function refreshChats (callback) {
  // if there is a currently selected chat, we need to search the new list
  // for the id to select the correct one.
  let selectedID = chats[selection]?.id ?? false
  selection      = selectedID === false ? 0 : undefined

  shim.getChats ((data) => {
    let newMessages = false
  
    chats = data.data.conversations

    for (let i = 0; i < chats.length; i++) {
      // check if there are any new messages
      if (chats[i].unread_count > 0) {
        notify(`(${chats[i].unread_count}) from ${chats[i].user.display_name}`)
        newMessages = true
      }
      
      // if this matches our selection, set the numeric selection to it.
      if (chats[i].id === selectedID) selection = i
    }
    
    if (newMessages) beep()
    ui.setChats(chats, selection)
    callback()
  }, (err) => {
    callback()
    error(err?.toString() ?? "unknown")
  })
}

function refreshMessages (callback, clear) {
  let chatID = chats[selection].id
  
  if (!chatHistories[chatID]) chatHistories[chatID] = {
    messages: [],
    lastTime: 0
  }

  let lastTime = chatHistories[chatID].lastTime
  chatHistories[chatID].lastTime = Math.floor(Date.now() / 1000)
  
  shim.getMessages (chats[selection].user.id, lastTime, (data) => {
    for (const message of data.data.messages) {
      chatHistories[chatID].messages.push(message)
    }

    refreshMessageDisplay(clear)
    callback()
  }, (err) => {
    chatHistories[chatID].lastTime = lastTime
    callback()
    error(err?.toString() ?? "unknown")
  })
}

function currentChatHistory () {
  return chatHistories[chats[selection].id]
}

function refreshMessageDisplay (clear) {
  // TODO: only clear messages when we need to
  clear = true
  for (const message of currentChatHistory().messages) {
    ui.addMessage (
      chats[selection].user.display_name,
      message.content,
      message.self,
      message.time,
      message.seen,
      clear
    )
    clear = false
  }
}

function send (content) {
  let status = ui.addStatus("Sending...")
  shim.sendMessage (
    chats[selection].user.id, content,
    () => {
      refreshMessages(() => {
        ui.delStatus(status)
      })
    }
  )
}

/* initial refresh */ {
  let status = ui.addStatus("Loading...")
  refreshChats (() => {
    ui.selectChat(0)
    ui.delStatus(status)
  })
}

let autoRefresh = setInterval (() => {
  if (lockRefresh) return
  let status = ui.addStatus("Refreshing...")
  refreshChats(() => {
    refreshMessages(() => {
      ui.delStatus(status)
    })
  })
}, 10000)


const shim         = require("./shim"),
      ui           = require("./ui"),
      fs           = require("fs"),
      os           = require("os"),
      readlineSync = require("readline-sync")

const confPath = `${os.homedir()}/.config/imhey/conf.json`
let conf = {}

function loadConf () {
  try {
    conf = JSON.parse(fs.readFileSync(confPath))
  } catch (err) {
    console.error("!!! config file malformed")
    conf = {}
  }
}

function saveConf () {
  fs.writeFileSync(confPath, JSON.stringify(conf))
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
    ui.setStatus("Loading...")
    refreshMessages(ui.clearStatus)
  },
  onsubmit: (message) => {
    ui.setStatus("Sending...")
    send(message)
  }
})

let conversations = []
/*  {
    id: 324922,
    last_message_time: 1643304503,
    unread_count: 0,
    user: {
      id: 1139200,
      display_name: "hobo13"
    }
  },
  {
    id: 331180,
    last_message_time: 1643299540,
    unread_count: 0,
    user: {
      id: 1152894,
      display_name: "clown"
    }
  }
]*/

let lockRefresh = false

function error (err) {
  ui.addMessage("API ERROR", err)
  ui.forceRefresh()
}

function refreshConvos (callback) {
  shim.getConversations ((data) => {
    conversations = data.data.conversations
    ui.setConversations(conversations)
    callback()
  }, (err) => {
    callback()
    error(err?.toString() ?? "unknown")
  })
}

function refreshMessages (callback) {
  shim.getMessages (conversations[selection].user.id, (data) => {
    for (const message of data.data.messages) {
      ui.addMessage (
        conversations[selection].user.display_name,
        message.content,
        message.self,
        message.time,
        message.seen
      )
    }
    callback()
  }, (err) => {
    callback()
    error(err?.toString() ?? "unknown")
  })
}

function send (content) {
  ui.setStatus("Sending...")
  shim.sendMessage (
    conversations[selection].user.id, content,
    () => {refreshMessages(ui.clearStatus)}
  )
}

ui.setStatus("Loading...")
refreshConvos (() => {
  ui.selectConversation(0)
})

let autoRefresh = setInterval (() => {
  if (lockRefresh) return
  ui.setStatus("Refreshing...")
  refreshConvos(() => {
    refreshMessages(ui.clearStatus)
  })
}, 30000)


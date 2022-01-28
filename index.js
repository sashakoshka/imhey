const shim         = require("./shim"),
      ui           = require("./ui"),
      fs           = require("fs"),
      os           = require("os"),
      readlineSync = require("readline-sync"),
      childProcess = require("child_process")

const confDirPath  = `${os.homedir()}/.config/imhey`
const confFilePath = confDirPath + "/conf.json"
let conf = {
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
    ui.setStatus("Loading...")
    refreshMessages(ui.clearStatus, true)
  },
  onsubmit: (message) => {
    ui.setStatus("Sending...")
    send(message)
    ui.countDown(20)
  },
  onrefresh: () => {
    lockRefresh = true
    ui.setStatus("Refreshing...")
    refreshConvos(() => {
      refreshMessages(() => {
        ui.clearStatus()
        lockRefresh = false
      })
    })
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

function beep () {
  childProcess.spawn(conf.beepCmd ?? "beep")
}

function refreshConvos (callback) {
  let newMessages = false

  shim.getConversations ((data) => {
    conversations = data.data.conversations
    selection = ui.setConversations(conversations)
    for (conv in conversations) {
      if (conv.unread_count > 0) newMessages = true
    }
    // doesnt work??
    if (newMessages) beep()
    callback()
  }, (err) => {
    callback()
    error(err?.toString() ?? "unknown")
  })
}

function refreshMessages (callback, clear) {
  shim.getMessages (conversations[selection].user.id, (data) => {
    for (const message of data.data.messages) {
      ui.addMessage (
        conversations[selection].user.display_name,
        message.content,
        message.self,
        message.time,
        message.seen,
        clear
      )
      clear = false
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


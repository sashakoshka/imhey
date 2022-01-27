const shim    = require("./shim"),
      ui      = require("./ui"),
      fs      = require("fs"),
      os      = require("os")

const confPath = `${os.homedir()}/.config/imhey/conf.json`
let conf = {}

function loadConf () {
  conf = JSON.parse(fs.readFileSync(confPath))
}

function saveConf () {
  conf = fs.writeFileSync(confPath, JSON.stringify(conf))
}

loadConf()
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


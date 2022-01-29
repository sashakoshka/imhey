/*
  ui
  further abstracts blessed into something we can use
*/

"use strict"

const blessed = require("neo-blessed")

let screen,
    chatListLabel,
    chatList,
    chatLabel,
    timerBar,
    chatHistory,
    inputPrompt,
    inputBox,
    conversations

let evh,
    selection,
    lockInput

let styles = {
  bg: {
    fg: "white",
    bg: "black"
  },
  select: {
    fg: "white",
    bg: "grey"
  },
  bar: {
    fg: "black",
    bg: "red"
  },
  action: {
    fg: "black",
    bg: "blue"
  },
  username: {
    fg: "red"
  }
}

function init (evh_) {
  evh = evh_
  selection = 0

  screen = blessed.screen();
  
  screen.title = "SpaceHey Instant Messanger"

  conversations = []
  
  chatListLabel = blessed.box ({
    top:    0,
    left:   0,
    width:  24,
    height: 1,
    align:  "center",
    content: "Conversations",
    style: styles.bar
  })

  chatList = blessed.box ({
    top:   1,
    left:  0,
    width: 24,
    height: "100%-1",
    scrollable: true,
    style: styles.bg
  })
  
  chatLabel = blessed.box ({
    top:   0,
    left:  25,
    width: "100%-25",
    height: 1,
    content: "",
    padding: {
      left:  1,
      right: 1
    },
    style: styles.bar
  })
  
  timerBar = blessed.box ({
    top:   0,
    left:  -1,
    width: "100%",
    height: 1,
    content: "",
    padding: {
      left:  1,
      right: 1
    },
    style: styles.action
  })

  chatHistory = blessed.box ({
    top: 1,
    left: 25,
    width: "100%-25",
    height: "100%-2",
    content: "",
    tags: true,
    scrollable: true,
    padding: {
      left:  1,
      right: 1
    },
    style: styles.bg
  })
  
  inputPrompt = blessed.box ({
    bottom: 0,
    left:   25,
    width:  3,
    height: 1,
    style: styles.bg,
    content: " >"
  })
  
  inputBox = blessed.textbox ({
    bottom: 0,
    left:   28,
    width: "100%-28",
    height: 1,
    style: styles.bg,
    keys: true,
    inputOnFocus: true
  })
  
  inputBox.key (['escape', 'C-d'], (ch, key) => {
    return process.exit(0);
  })

  inputBox.on ("action", () => {
    inputBox.focus()
  })

  inputBox.on ("submit", () => {
    if (!lockInput) {
      evh.onsubmit(inputBox.getValue())
      inputBox.clearValue()
    }
    screen.render()
  })

  // this shoudl not happen
  screen.key (['C-c'], (ch, key) => {
    return process.exit(0);
  })
  
  inputBox.key (['up'], (ch, key) => {
    selectPrev()
  })
  
  inputBox.key (['down'], (ch, key) => {
    selectNext()
  })
  
  inputBox.key (['pageup'], (ch, key) => {
    chatHistory.scroll(1)
    screen.render()
  })
  
  inputBox.key (['pagedown'], (ch, key) => {
    chatHistory.scroll(-1)
    screen.render()
  })
  
  inputBox.key (['C-r'], (ch, key) => {
    evh.onrefresh()
  })
  
  screen.append(chatListLabel)
  screen.append(chatList)
  screen.append(chatLabel)
    chatLabel.append(timerBar)
  screen.append(chatHistory)
  screen.append(inputPrompt)
  screen.append(inputBox)
  
  inputBox.focus()
  timerBar.hide()
  
  screen.render()
}

function selectNext () {
  let item = selection + 1
  if (item >= conversations.length) item = 0
  selectConversation(item)
}

function selectPrev () {
  let item = selection - 1
  if (item < 0) item = conversations.length - 1
  selectConversation(item)
}

function selectConversation (number) {
  if (conversations.length === 0) return

  conversations[selection].widget.style = styles.bg
  conversations[selection].widget.setText(conversations[selection].name)

  selection = number
  
  if (selection < 0 || selection > conversations.length) selection = 0
  
  conversations[selection].widget.style = styles.select
  conversations[selection].widget.setText("> " + conversations[selection].name)

  chatLabel.setText(`User ${conversations[selection].name}`)

  chatHistory.setContent("")
  evh.onselect(selection)

  screen.render()
}

function setConversations (list, newSelection) {
  selection = newSelection

  for (const conv of conversations) {
    conv.widget.detach()
  }
  
  conversations = []

  for (let i = 0; i < list.length; i++) {
    let convData = list[i]
    let conv = blessed.box ({
      left:    0,
      top:     i,
      width:   24,
      height:  1,
      content: ((convData.unread_count) ? `(${convData.unread_count}) ` : "")
             + ((i === selection) ? "> " : "")
             + convData.user.display_name,
      padding: {
        left:  1,
        right: 1
      },
      style: ((i === selection) ? styles.select : styles.bg)
    })

    chatList.append(conv)
    conversations.push ({
      name:   list[i].user.display_name,
      widget: conv,
      id:     list[i].id // where possible, we use convo id to refer to convo
    })
  }

  screen.render()
}

let statuses = {}
let statusCount = 0

function updateStatus () {
  if (Object.keys(statuses).length > 0) {
    // if there are statuses in the list, display the most recent one
    let key = Object.keys(statuses).reduce (
      (a, b) => statuses[a] > statuses[b] ? a : b
    )
    chatListLabel.setText(statuses[key])
    chatListLabel.style = styles.action
  } else {
    // if there are none, reset the text back to normal
    chatListLabel.setText("Conversations")
    chatListLabel.style = styles.bar
  }
  
  screen.render()
}

function addStatus (status) {
  let statusKey = statusCount ++
  statuses[statusKey] = status
  updateStatus()
  return statusKey
}

function delStatus (statusKey) {
  if (statuses.hasOwnProperty(statusKey))
    delete statuses[statusKey]
  else
    throw new Error(`undefined status key ${statusKey}`)
  updateStatus()
  screen.render()
}

function addMessage (user, content, self, time, seen, clear) {
  if (self) user = "you"
  
  let text = `{${styles.username.fg}-fg}[${user}]:{/} `
           + `${content.replace(/<br>/g, '\n    ')}`
  if (chatHistory.getText() === "" || clear)
    chatHistory.setContent(text)
  else
    chatHistory.insertBottom(text)
  
  chatHistory.scrollTo(chatHistory.getScrollHeight())
}

function forceRefresh () {
  screen.render()
}

function countDown (countMax) {
  let count = countMax

  lockInput = true
  timerBar.show()
  timerBar.setText(`${count} sec`)
  
  let countInterval = setInterval (() => {
    count--
    
    if (count === 0) {
      clearInterval(countInterval)
      lockInput = false
      timerBar.hide()
      screen.render()
      return
    }

    timerBar.setText(`${count} sec`)
    timerBar.width = `${count / countMax * 100}%`
    screen.render()
  }, 1000)
}

module.exports = {
  init,
  setConversations,
  selectConversation,
  addStatus,
  delStatus,
  addMessage,
  forceRefresh,
  countDown
}

/*
  ui
  further abstracts blessed into something we can use
*/

"use strict"

const blessed = require("neo-blessed")

let screen,
    chatLabel,
    chatListLabel,
    chatList,
    inputPrompt,
    inputBox,
    chatHistory,
    conversations

let evh,
    selection,
    lockInput

function init (evh_) {
  evh = evh_
  selection = 0

  screen = blessed.screen();
  
  screen.title = "SpaceHey Instant Messanger"

  conversations = []
  
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
    style: {
      fg: "black",
      bg: "red"
    }
  })
  
  chatListLabel = blessed.box ({
    top:    0,
    left:   0,
    width:  24,
    height: 1,
    align:  "center",
    content: "Conversations",
    style: {
      fg: "black",
      bg: "red"
    }
  })

  chatList = blessed.box ({
    top:   1,
    left:  0,
    width: 24,
    height: "100%-1",
    scrollable: true,
    style: {
      bg: "black"
    }
  })
  
  inputPrompt = blessed.box ({
    bottom: 0,
    left:   25,
    width:  3,
    height: 1,
    style: {
      fg: "white",
      bg: "black"
    },
    content: " >"
  })
  
  inputBox = blessed.textbox ({
    bottom: 0,
    left:   28,
    width: "100%-28",
    height: 1,
    style: {
      fg: "white",
      bg: "black"
    },
    keys: true,
    inputOnFocus: true
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
    style: {
      fg: "white",
      bg: "black"
    }
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
  
  screen.append(chatLabel)
  screen.append(chatListLabel)
  screen.append(chatList)
  screen.append(inputPrompt)
  screen.append(inputBox)
  screen.append(chatHistory)
  
  inputBox.focus()
  
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

  conversations[selection].widget.style = {
    fg: "white",
    bg: "black"
  }

  conversations[selection].widget.setText(conversations[selection].name)

  selection = number
  
  if (selection < 0 || selection > conversations.length) selection = 0
  
  conversations[selection].widget.style = {
    fg: "white",
    bg: "grey"
  }

  conversations[selection].widget.setText("> " + conversations[selection].name)

  chatLabel.setText(`User ${conversations[selection].name}`)

  chatHistory.setContent("")
  evh.onselect(selection)

  screen.render()
}

function setConversations (list) {
  // if there is a currently selected convo, we need to search the new list for
  // the id to select the correct one.
  let selectedID = conversations[selection]?.id ?? false
  selection      = selectedID === false ? 0 : undefined

  for (const conv of conversations) {
    conv.widget.detach()
  }
  
  conversations = []

  for (let i = 0; i < list.length; i++) {
    // if this matches our selection, set the numeric selection to it.
    if (list[i].id === selectedID) selection = i
    
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
      style: (
        (i === selection) ? {
          fg: "white",
          bg: "grey"
        } : {
          fg: "white",
          bg: "black"
        }
      )
    })

    chatList.append(conv)
    conversations.push ({
      name:   list[i].user.display_name,
      widget: conv,
      id:     list[i].id // where possible, we use convo id to refer to convo
    })
  }

  screen.render()

  return selection
}

function setStatus (status) {
  chatListLabel.setText(status)
  chatListLabel.style = {
    fg: "black",
    bg: "blue",
  }
  screen.render()
}

function clearStatus (status) {
  chatListLabel.setText("Conversations")
  chatListLabel.style = {
    fg: "black",
    bg: "red",
  }
  screen.render()
}

function addMessage (user, content, self, time, seen, clear) {
  if (self) user = "you"
  
  let text = `{red-fg}[${user}]:{/} ${content.replace(/<br>/g, '\n    ')}`
  if (chatHistory.getText() === "" || clear)
    chatHistory.setContent(text)
  else
    chatHistory.insertBottom(text)
  
  chatHistory.scrollTo(chatHistory.getScrollHeight())
}

function forceRefresh () {
  screen.render()
}

function countDown (count) {
  lockInput = true
  let countInterval = setInterval (() => {
    if (count === 0) {
      clearInterval(countInterval)
      inputPrompt.setText(" >")
      lockInput = false
      screen.render()
      return
    }

    inputPrompt.setText(` ${count}`)
    screen.render()
    
    count--
  }, 1000)
}

module.exports = {
  init,
  setConversations,
  selectConversation,
  setStatus,
  clearStatus,
  addMessage,
  forceRefresh,
  countDown
}

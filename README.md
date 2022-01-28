# imhey

SpaceHey has a very wierd "instant messanger" built into it. I got really
curious and decided to figure out how it worked. Long story short I reverse
engineered the api a bit, and made an alternative client.

Please be aware that this is VERY UNSTABLE and does not handle edge cases very
well. It is just a proof of concept for now.

## Setup

In order for it to work, you need to find your session ID, and put it in the
config file using these steps:

1. Log into spacehey
2. Open up the F12 menu
3. Go to the network tab
4. Reload the page
5. Click on any request in the list
6. Scroll down to where it says request headers, and you should see a header
   called "Cookie"
7. Find your session ID. It is the string of random numbers and letters after
   "PHPSESSID=".
8. Copy the session ID. Make sure to only copy the numbers and letters starting
   after the = sign and ending before the semicolon.
9. Create the directory `~/.config/imhey`

Then, navigate to the directory of this repo and run `node index.js`, and it
should ask for your key. Once you enter it, you should be able to use the
program. 

## Usage

On the left, you can see all of you conversations. On the right, you can see the
conversation history of the currently selected conversation. You can send a
message by typing and pressing enter, and you can switch to different
conversations by pressing up or down.

If you are getting random nonsense on screen while switching between chats,
let it load the chat first before switching to a new one. This shouldn't happen,
but it might until I create a more robust system for storing messages.

There is currently no way to start a new chat from within this client, you have
to do that on the website.

## Planned features

In the future, this will be optimized to be more efficient than the official
client. This will be done by caching messages from all chats to disk, and only
loading the ones it needs to. That way whenever you switch chats it won't have
to load the entire chat history from the server.

I will also probably add a new chat feature, and probably fix the ridiculous
amount of bugs.

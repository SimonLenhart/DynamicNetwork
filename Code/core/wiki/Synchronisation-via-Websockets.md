One main feature provided by TEAMWISE is the possibility to synchronise the animation across different browser windows (that may also be on different devices!). This is achieved through a communication of all instances via websockets.

On the server side, there is one websocket server running that can receive messages from individual websockets and is on the other hand able to send messages to other websockets. Messages, in that case are stringified JSON objects that underly a specific message protocol:

`{`

`  "type": "update",`

`  "time": "2015-04-19T09:51:26Z",`

`  "multiplier": 1.0,`

`  "shouldAnimate": true | false`
    
`}`

The client side logic of the synchronisation feature can be found in the `core/Teamwise/sync/syncModule.js` file. Currently, this only provides functions to broadcast file uploads and state changes - and to update received state changes. In the future, this will be extended to provide more generl functions to enable future extensions to send and receive respective messages.
'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
var Yelp = require('yelp');
const app = express()

const yelpTokenSecret = process.env.YELP_TOKEN_SECRET
const yelpConsumerSecret = process.env.YELP_CONSUMER_SECRET
const facebookToken = process.env.FB_PAGE_ACCESS_TOKEN

//Yelp
var yelp = new Yelp({
  consumer_key: 'Qq97hE7r8TaIMbStTIpGpQ',
  consumer_secret: yelpConsumerSecret,
  token: 'dLTYNnqhPoUVKZdU9vlM9xT78v-Xw-En',
  token_secret: yelpTokenSecret,
});

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

//To process messages
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200) + testSearch())
        }
    }
    res.sendStatus(200)
})

// Echo back messages
function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:facebookToken},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function testSearch(){
	yelp.search({ term: 'food', location: 'Montreal' })
.then(function (data) {
  return data;
})
.catch(function (err) {
  return err;
});
}










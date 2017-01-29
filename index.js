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
            queryYelp(sender, text)
            //sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200));
        }
    }
    res.sendStatus(200)
})


//Query yelp with your message
function queryYelp(sender, message) {
    // {term: 'yelp', location: 'sf', limit: 1}
    var query = searchWithOnlyLocation(message);
    yelp.search(query).then(function (data) {
        console.log(data);
        checkBussinessRatingBeforeSending(data, sender);
    })
    .catch(function (err) {
    console.log(err);
    });
}


//Itterates through all businesses returned and checks to see if they are worthy (3.6 stars or higher)
function checkBussinessRatingBeforeSending(data, sender){
    for (var i = 0; i < data.businesses.length; i++){
            if (data.businesses[i].rating > 3.6){
                sendMessengerCard(sender,  data);
            }
        }
}

// Sends a message to the user
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

function convertToSendable(data) {
    let messageData = {
        attachment:{
          type:"template",
          payload:{
            template_type:"generic",
            elements:[
               {
                title: data.businesses[i].name,
                image_url: data.businesses[i].image_url,
                default_action: {
                  type: "web_url",
                  url: data.businesses[i].mobile_url,
                  webview_height_ratio: "tall"
                },
                buttons:[
                  {
                    type:"web_url",
                    url:data.businesses[i].mobile_url,
                    title:"View Website"
                  }     
                ]      
              }
            ]
          }
        }
    }
    return messageData;
}

// Sends a card message back to the user
function sendMessengerCard(sender, data) {
    var card = convertToSendable(data);
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:facebookToken},
        method: 'POST',
        json: data
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}


function searchWithOnlyLocation(message){
    var searchQuery = {term: "food", limit: 5};
    searchQuery["location"] = message;
    return searchQuery;
}

//Takes the user input and parses it into a JSON object that can be used to query
//Currently not being used and searchWithOnlyLocation is being used.
function parseInput(message){
  console.log(message);
  message = message.replace(/\s+/g,"");
  var searchParameters = message.split(",");
  var searchObj = {}
  for(var i = 0; i < searchParameters.length; i++){
    var temp = searchParameters[i].split(":");
    var key = temp[0];
    var value = temp[1];
    searchObj[key] = value;
  }
  console.log(searchObj);
  return searchObj;
}


function validQueryCheck(){

}


//test query: {term: 'yelp', location: 'sf', limit: 1}








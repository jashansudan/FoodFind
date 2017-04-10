'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
var Yelp = require('yelp');
const app = express();

const yelpTokenSecret = process.env.YELP_TOKEN_SECRET
const yelpConsumerSecret = process.env.YELP_CONSUMER_SECRET
const facebookToken = process.env.FB_PAGE_ACCESS_TOKEN

//Yelp node package code
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
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong token');
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
})

//To process messages
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i];
        let sender = event.sender.id;
        if (event.message) {
            let text = event.message;
            parseLocation(sender, text);
            //queryYelp(sender, text);
            //sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200));
        }
    }
    res.sendStatus(200);
})

//Query yelp with your message
function queryYelp(sender, message) {
    let query = searchWithOnlyLocation(message);
    yelp.search(query).then(function (data) {
        console.log(data);
        checkBussinessRatingBeforeSending(data, sender);
    })
    .catch(function (err) {
    console.log(err);
    });
}

// Sets predfined queries and simply takes the users location to produce outputs
function searchWithOnlyLocation(message){
    let searchQuery = {term: "food", limit: 5};
    searchQuery["location"] = message;
    return searchQuery;
}

//Itterates through all businesses returned and checks to see if they are worthy (3.6 stars or higher)
function checkBussinessRatingBeforeSending(data, sender){
    for (let i = 0; i < data.businesses.length; i++){
            if (data.businesses[i].rating > 3.6){
                sendMessengerCard(sender,  data.businesses[i]);
        }
    }
}

// Sends a card message back to the user
function sendMessengerCard(sender, data) {
    let card = convertToSendable(data);
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:facebookToken},
        method: 'POST',
        json: {
              recipient: {id:sender},
              message: card
            }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

//Tekes the query results, and converts it into a sendable card
function convertToSendable(data) {
    let messageData = {
        attachment:{
          type:"template",
          payload:{
            template_type:"generic",
            elements:[
               {
                title: data.name,
                subtitle: "Rating: " + data.rating,
                image_url: data.image_url,
                default_action: {
                  type: "web_url",
                  url: data.mobile_url,
                  webview_height_ratio: "tall"
                }   
              }
            ]
          }
        }
    }
    return messageData;
}


function requestLocation(sender){
  let message = {
    "text":"Please share your location:",
    "quick_replies":[
      {
        "content_type":"location",
      }
    ]
  }
  request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token:facebookToken},
      method: 'POST',
      json: {
            recipient: {id:sender},
            message: message
          }
  }, function(error, response, body) {
      if (error) {
          console.log('Error sending messages: ', error)
      } else if (response.body.error) {
          console.log('Error: ', response.body.error)
      }
  })
}

// Sends a message to the user, requires more specific input in the text field
// Currently not being used as it's been swapped out for Cards
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
            console.log('Error sending messages: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    })
}


function  parseLocation(sender, message){
  let lat = message[attachments][0][payload][coordinates][lat];
  let long = message[attachments][0][payload][coordinates][long];
  let textInfo = "Your lat is " + lat + "Your long is: " + long;
  let messageData = { text:textInfo}
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
            console.log('Error sending messages: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    })
}

//Takes the user input and parses it into a JSON object that can be used to query
//Currently not being used and searchWithOnlyLocation is being used.
function parseInput(message){
  message = message.replace(/\s+/g,"");
  let searchParameters = message.split(",");
  let searchObj = {}
  for(let i = 0; i < searchParameters.length; i++){
    let temp = searchParameters[i].split(":");
    let key = temp[0];
    let value = temp[1];
    searchObj[key] = value;
  }
  console.log(searchObj);
  return searchObj;
}



//TODO: Have multiple input analysis, so that when a user starts a conversation
// a prompt is sent, and then followed up by asking for location and finally,
// a response is returned with nearby food places
// TODO: Database integration
// Things to think about: Machine learning prediction model


//test query: {term: 'yelp', location: 'sf', limit: 1}








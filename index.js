const { App } = require('@slack/bolt');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const https = require('https');
const cors = require('cors');

const app = express();

// Load env
require('dotenv').config();

function generateSlackMessage(data,prospectus_link) {
  const eventData = data[0];
  const website = `http://${eventData.website}`;
  
  const message = [
    {
      type: 'context',
      elements: [
        {
          type: 'plain_text',
          text: 'New Event Approval Requested',
          emoji: true
        }
      ]
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `**Event Details:** \n - ID: ${eventData.id} \n -  Title: ${eventData.title} \n - Slug: ${eventData.slug} \n -  DG Key: ${eventData.dg_key} \n -  Approval Status: ${eventData.approval_status} \n -  Start Date: ${eventData.start_date} \n -  End Date: ${eventData.end_date} \n -  User ID: ${eventData.user_id} \n - Contact Email: ${eventData.contact_email} \n -  Website: ${website} \n -  Description: ${eventData.description} \n -  Organizer Name: ${eventData.organizer_name} \n -  Country: ${eventData.country} \n -  City: ${eventData.city} \n -  State: ${eventData.state} \n - Street Address: ${eventData.street_address} \n -  ZIP Code: ${eventData.zip_code} \n -  Prospectus Link: ${prospectus_link}`
        }
      ]
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'approve_button',
          text: {
            type: 'plain_text',
            emoji: true,
            text: 'Approve'
          },
          style: 'primary',
          value: eventData.id
        },
        {
          type: 'button',
          action_id: 'reject_button',
          text: {
            type: 'plain_text',
            emoji: true,
            text: 'Reject'
          },
          style: 'danger',
          value: eventData.id
        }
      ]
    }
  ];
  
  return message;
}

// Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Initializes your app with your bot token and signing secret
const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Function to send a message to a Slack channel
async function sendMessage(channel, message) {
  try {
    await slack.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channel,
      blocks: message,
      text : "New Event Approval Requested"
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

(async () => {
  // Start your app
  await slack.start(process.env.PORT || 5000);

  console.log('⚡️ Bolt app is running!');
  console.log('PORT:', process.env.PORT || '5000');
})();

// Define your API route for handling the POST request
app.post('/alert-slack', async (request, response) => {
  let message = [
    {
      type: 'context',
      elements: [
        {
          type: 'plain_text',
          text: 'New Event Approval Requested',
          emoji: true
    }
  ]}];

  try{
  const event_data = request.body.event_data;
  const prospectus_link = request.body.prospectus_link;
  message = generateSlackMessage(event_data ,prospectus_link);
  } catch (error) {
    console.error('Error sending message:', error);
  }
  
  // Send a message to a specific Slack channel
  const channel = 'test'; // Replace with your desired channel name or ID

  await sendMessage(channel, message);

  // Optionally, send a response back to the client
  response.send('Message sent to Slack');
});

app.post('/request', async (request, response) => {
  try {
    const payload = JSON.parse(request.body.payload);
    let button_type = payload.actions[0].action_id;
    let event_id = payload.actions[0].value;
    let event_type = "";
    if (button_type == 'approve_button') {
      event_type = "approved";
      try {
        const res = await axios.post(process.env.EVENT_CAPTIONER_ENDPOINT, {
          event_id: event_id,
          event_status: 'approved'
        }, {
          // Set rejectUnauthorized to false if using self-signed SSL certificate
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        
      } catch (error) {
        console.error('Error:', error.message);
      }
    } else if (button_type == 'reject_button') {
      event_type = "rejected";
      try {
        const res = await axios.post(process.env.EVENT_CAPTIONER_ENDPOINT, {
          event_id: event_id,
          event_status: 'rejected'
        }, {
          // Set rejectUnauthorized to false if using self-signed SSL certificate
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        
      } catch (error) {
        console.error('Error:', error.message);
      }
    }

    chat_update = {
      "channel": payload.channel.id,
      "ts": payload.message.ts,
      "text": "Event "+event_type+" by " + payload.user.name,
      "blocks": [
        {
          "type": "context",
          "elements": [
            {
              "type": "plain_text",
              "text": "Event "+event_type+" by @" + payload.user.name,
              "emoji": true
            },
            {
              "type": "mrkdwn",
              "text": "\n*Event Title:* " + payload.message.blocks[1].elements[0].text
            }
          ]
        }]
    };

    await slack.client.chat.update(chat_update);

    response.send({
      "replace_original": "true",
      "text": "Thanks for your request, we'll process it and get back to you."
    });

  } catch (error) {
    console.error('Error parsing payload:', error);
    response.status(400).send('Bad Request');
  }
});

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log('Server listening on port', process.env.PORT || 3000);
});

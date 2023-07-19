const { App } = require('@slack/bolt');
const {createClient} = require('@supabase/supabase-js');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Load env
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

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
          text: {
            type: 'plain_text',
            emoji: true,
            text: 'Approve'
          },
          style: 'primary',
          value: 'click_me_123'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            emoji: true,
            text: 'Reject'
          },
          style: 'danger',
          value: 'click_me_123'
        }
      ]
    }
  ];
  
  return message;
}

// Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
app.post('/api/data', async (request, response) => {
  console.log('Received data:', request.body);

  const event_id = request.body.id;
  const event_type = request.body.event_type; 
  var message = null;

  try{
    const {data,error} = await supabase.from('events').select('id, title, slug, key, dg_project, dg_key, approval_status, start_date, end_date, total_days, user_id, contact_email, website, description, organizer_name, country, city, state, street_address, zip_code').eq('id', event_id).limit(1);

    var prospectus_link = null;

    try{
      const { data: fileData, error: fileError } = await supabase.storage
      .from("event-prospectus")
      .getPublicUrl(`${event_id}/Prospectus`);
      if (!fileError) {
        prospectus_link = fileData['publicUrl'];
      }
      } catch(e){
          console.log(e);
       }
      
       message = generateSlackMessage(data ,prospectus_link);
      
  } catch (error) {
    console.error('Error sending message:', error);
  }
  
  // Send a message to a specific Slack channel
  const channel = 'test'; // Replace with your desired channel name or ID

  await sendMessage(channel, message);

  // Optionally, send a response back to the client
  response.send('Message sent to Slack');
});

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log('Server listening on port', process.env.PORT || 3000);
});

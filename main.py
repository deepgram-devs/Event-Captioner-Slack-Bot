import slack
import os
from dotenv import load_dotenv

env_path = '.env'
load_dotenv(env_path)

client = slack.WebClient(os.environ.get('SLACK_BOT_TOKEN'))

client.chat_postMessage(channel='test',text='Yo!')
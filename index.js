
const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios').default;
const Groq = require('groq-sdk')
require('dotenv').config();

const app = express();
const port = 3000;

const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY ,});
console.log("LINE Config:", lineConfig);
const client = new line.Client(lineConfig);
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    console.log("Received events:", events);

    await Promise.all(events.map(event => handleEvent(event)));

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).end();
  }
});

const handleEvent = async (event) => {
  console.log("Handling event:", event);

  if (event.type === 'message' && event.message.type === 'text') {
    try {
      const userMessage = event.message.text;
      const completion = await groqClient.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are a friendly LINE chatbot. Keep replies concise and helpful.' },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 256,
      });

      const replyText = completion?.choices?.[0]?.message?.content?.trim() || "I don't have a response.";

      await client.replyMessage(event.replyToken, [
        { type: 'text', text: replyText }
      ]);

    } catch (err) {
      console.error("Reply error:", err);
      await client.replyMessage(event.replyToken, [
        { type: 'text', text: "Sorry, something went wrong." }
      ]);
    }
  }

  return "null";
};


app.get('/hi', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

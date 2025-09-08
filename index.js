
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
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;

    try {
      const { rows } = await naturalQuery(userMessage);
      const replyText = formatResult(rows);

      await client.replyMessage(event.replyToken, [
        { type: "text", text: replyText },
      ]);
    } catch (err) {
      console.error("DB Query error:", err.message);

      const completion = await groqClient.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a friendly LINE chatbot." },
          { role: "user", content: userMessage },
        ],
      });

      const replyText =
        completion?.choices?.[0]?.message?.content?.trim() ||
        "Sorry, I couldn’t answer that.";

      await client.replyMessage(event.replyToken, [
        { type: "text", text: replyText },
      ]);
    }
  }
};

async function naturalQuery(userMessage) {
  const completion = await groqClient.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      {
        role: "system",
        content: `You are a PostgreSQL assistant. 
        The database has a table "products(id, name, category, price, quantity)".
        Convert the user request into a single SQL SELECT query.
        Do NOT use DROP, DELETE, UPDATE, INSERT, or ALTER.`,
      },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
    max_tokens: 200,
  });

  const sql = completion?.choices?.[0]?.message?.content?.trim();
  console.log("Generated SQL:", sql);

  if (!sql.toLowerCase().startsWith("select")) {
    throw new Error("Unsafe query blocked: " + sql);
  }

  const result = await pool.query(sql);
  return { sql, rows: result.rows };
}
function formatResult(rows) {
  if (!rows || rows.length === 0) {
    return "No results found.";
  }

  if (rows.length === 1) {
    const row = rows[0];
    if (Object.keys(row).length === 1) {
      return `Result: ${Object.values(row)[0]}`;
    }
    return JSON.stringify(row);
  }
  return rows
    .map((r, i) => `${i + 1}. ${Object.values(r).join(" | ")}`)
    .join("\n");
}
app.get('/hi', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

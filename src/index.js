const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const MongoDbModule = require('./db/MongoDb');
const getDayTimestamp = require('./utils/DateUtils');

const TOKEN = process.env.TELEGRAM_TOKEN;

const rankingBuilder = (positions) => {
    return `Ranking de poles:
${positions.join('\n')}
`
}

async function main() {
    console.log("Connecting to MongoDB...");
    const db = await MongoDbModule.connectDB();
    console.log({db});

    const bot = new TelegramBot(TOKEN, {polling: true});

    /**
     * !Pole command
     */
    bot.onText(/!pole/, async (msg) => {
        const user = msg.from;
        const userName = user.username;
        const chatId = msg.chat.id;
        const currentTimestamp = getDayTimestamp();

        // Insert pole
        const res = await MongoDbModule.addPole(currentTimestamp, userName, user.id, chatId);

        if (res.upsertedCount >= -1)  {            
            const ranking = await MongoDbModule.updatePolesRanking(chatId, user);
            const msg = `
Pole para <b>${userName}.</b>
${rankingBuilder(ranking)}
`
            bot.sendMessage(chatId, msg, {parse_mode:'HTML'})
        }
    });

    /**
     * !Ranking command
     */
    bot.onText(/!ranking/, async (msg) => {
        const notFoundMsg = `Ranking no existente para este chat.`;
        const chatId = msg.chat.id;

        // Get Ranking
        const res = await MongoDbModule.getPolesRanking(chatId);
        if (res === null) {
            bot.sendMessage(chatId, notFoundMsg);
        } else {
            const msg = rankingBuilder(res);
            bot.sendMessage(chatId, msg);
        }
    })
}

main();

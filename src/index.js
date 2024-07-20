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

let polesDic = {}

async function main() {
    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ', err);
    });

    console.log("Connecting to MongoDB...");
    const db = await MongoDbModule.connectDB();
    console.log({db});

    // Failed to connect to DB
    if (!db) {
        process.exit(1);
    }

    const bot = new TelegramBot(TOKEN, {polling: true});

    /**
     * !Pole command: 
     *  Any type of message will trigger a pole position if it is
     *  the first of the day
     */
    bot.on("message", async (msg) => {
        const user = msg.from;
        const userName = user.username;
        const chatId = msg.chat.id;
        const currentTimestamp = getDayTimestamp();

        if (polesDic[chatId] && polesDic[chatId] == currentTimestamp) {
            return
        }

        // Insert pole
        const res = await MongoDbModule.addPole(currentTimestamp, userName, user.id, chatId);
        polesDic[chatId] = currentTimestamp;

        if (res.upsertedCount >= 1)  {            
            const ranking = await MongoDbModule.updatePolesRanking(chatId, user);
            const botMsg = `
Pole para <b>${userName}.</b>
${rankingBuilder(ranking)}
`
            bot.sendMessage(chatId, botMsg, {parse_mode:'HTML', reply_to_message_id: msg.message_id})
        }
    })

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

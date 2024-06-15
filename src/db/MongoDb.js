const { MongoClient  } = require('mongodb');

const POLES_COLLECTION = "Poles";
const RANKING_COLLECTION = "Ranking"

let db;

/**
 * Establish mongo db connection
 * @returns Mongo db instance
 */
async function connectDB() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

    try {
        console.log("Trying MongoDB");
        await client.connect();
        db = client.db();

        console.log("Connected to MongoDB");

        // Check if Collections exists, if not create them
        const polesCollection = await db.listCollections({ name: POLES_COLLECTION }).toArray();
        if (polesCollection.length === 0) {
            await db.createCollection(POLES_COLLECTION);
        }
        const rankingCollection = await db.listCollections({ name: RANKING_COLLECTION }).toArray();
        if (rankingCollection.length === 0) {
            await db.createCollection(RANKING_COLLECTION);
        }

        return db;
    } catch (e) {
        console.error(e);
    } 
}

/**
 * Adds a pole to the Poles collection
 * @param {Number} id is the timestamp of the current day at 00:00:00 for Spain TZ
 * @param {*} user 
 * @param {*} userId 
 * @param {*} chatId 
 * @returns 
 */
async function addPole(id, user, userId, chatId) {
    try {
        const polesCollection = db.collection(POLES_COLLECTION);
        const res = await polesCollection.updateOne(
            {"id": id, "chatId": chatId},
            { $setOnInsert: {
                "id": id,
                "chatId": chatId,
                "user": user,
                "userId": userId
            }},
            { upsert: true }
        );

        return res;
    } catch (e) {
        console.error(e);
    } 
}

/**
 * Generates ranking of users sorted from highest poles to lowest
 * @param {Array} users 
 * @returns Array of sorted positions of users and their poles count
 */
const generateRanking = (users) => {
    const sortedRanking = users.sort((a, b) => b.count - a.count);
    const positionsEmojis = [`1️⃣`, `2️⃣`, `3️⃣`];

    return sortedRanking.map((pole, idx) => {
        let prefix = `🤡`;
        if (idx <= 2) {
            prefix = positionsEmojis[idx];
        } 
        return `${prefix}-${pole.name}: ${pole.count}`
    })
}

/**
 * Get poles Ranking
 * @param {Number} chatId 
 * @returns ranking
 */
async function getPolesRanking(chatId) {
    try {
        const rankingCollection = db.collection(RANKING_COLLECTION);
        const ranking = await rankingCollection.find({chatId}).toArray();

        if (ranking.length === 1) {
            return generateRanking(ranking[0].users);
        } 
        return null;
    } catch (e) {
        console.log(e)
    }
}

/**
 * Updates Ranking collection after a successful pole is inserted
 * @param {Number} chatId 
 * @param {JSON} user: username and id 
 * @returns 
 */
async function updatePolesRanking(chatId, {username, id}) {
    try {
        const rankingCollection = db.collection(RANKING_COLLECTION);
        const ranking = await rankingCollection.find({chatId}).toArray();

        if (ranking.length === 0) {
            const newRanking = {
                chatId,
                users: [
                    {
                        id,
                        name: username,
                        count: 1
                    }
                ]
            }
            const resInsert = await rankingCollection.insertOne(newRanking);
            if (resInsert.acknowledged && resInsert.insertedId) {
                return generateRanking(newRanking.users);
            }
        }

        let users = ranking[0].users;
        if (users.find(u => u.id === id)) {
            users = users.map(user => {
                // Increase pole count
                if (user.id === id) {
                    user.count++;
                    // Check if user changed their name and update it
                    if (user.name !== username) user.username = username;
                }
                return user;
            });
        } 
        else {
            users.push({
                id,
                name: username,
                count: 1
            });
        }
        
        const res = await rankingCollection.updateOne(
            {"chatId": chatId},
            { $set: {
                "users": users
            }}
        );
        return generateRanking(users);
    } catch (e) {
        console.error(e)
    }
}

module.exports = {
    connectDB,
    addPole,
    getPolesRanking,
    updatePolesRanking
}

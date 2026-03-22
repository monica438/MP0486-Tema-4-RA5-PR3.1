const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const xml2js = require('xml2js');
const he = require('he');
const winston = require('winston');
require('dotenv').config();

const xmlFilePath = path.join(__dirname, '../../data/Posts.xml');

const logDir = path.join(__dirname, './data/logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.File({
            filename: path.join(logDir, 'exercici1.log')
        }),
        new winston.transports.Console()
    ]
});

async function parseXMLFile(filePath) {
    try {
        const xmlData = fs.readFileSync(filePath, 'utf-8');

        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true
        });

        return new Promise((resolve, reject) => {
            parser.parseString(xmlData, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

    } catch (error) {
        logger.error("Error llegint XML", error);
        throw error;
    }
}

function processPosts(data) {

    let posts = data.posts.row;

    if (!Array.isArray(posts)) {
        posts = [posts];
    }

    const questions = posts
        .filter(post => post.PostTypeId === "1")
        .map(post => ({

            question: {

                Id: post.Id,
                PostTypeId: post.PostTypeId,
                AcceptedAnswerId: post.AcceptedAnswerId || null,
                CreationDate: post.CreationDate,
                Score: post.Score,
                ViewCount: parseInt(post.ViewCount || 0),

                Body: he.decode(post.Body || ""),

                OwnerUserId: post.OwnerUserId,
                LastActivityDate: post.LastActivityDate,
                Title: he.decode(post.Title || ""),

                Tags: post.Tags,
                AnswerCount: post.AnswerCount,
                CommentCount: post.CommentCount,
                ContentLicense: post.ContentLicense

            }

        }));

    questions.sort(
        (a, b) =>
            b.question.ViewCount -
            a.question.ViewCount
    );

    return questions.slice(0, 10000);
}

async function loadDataToMongoDB() {

    const uri =
        process.env.MONGODB_URI ||
        'mongodb://root:password@localhost:27017/';

    const client =
        new MongoClient(uri);

    try {

        await client.connect();

        logger.info("Connectat a MongoDB");

        const db =
            client.db("stackexchange");

        const collection =
            db.collection("questions");

        logger.info("Llegint XML...");

        const xmlData =
            await parseXMLFile(xmlFilePath);

        logger.info("Processant dades...");

        const questions =
            processPosts(xmlData);

        logger.info(
            `Total preguntes: ${questions.length}`
        );

        await collection.deleteMany({});

        logger.info("Inserint dades...");

        const result =
            await collection.insertMany(questions);

        logger.info(
            `${result.insertedCount} documents inserits`
        );

    } catch (error) {

        logger.error(
            "Error carregant dades",
            error
        );

    } finally {

        await client.close();

        logger.info(
            "Connexió tancada"
        );

    }

}

loadDataToMongoDB();
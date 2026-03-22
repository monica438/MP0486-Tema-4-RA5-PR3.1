const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const outputDir =
    path.join(__dirname, './data/out');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {
        recursive: true
    });
}

function generatePDF(filename, titles) {

    const doc = new PDFDocument();

    const filePath =
        path.join(outputDir, filename);

    doc.pipe(
        fs.createWriteStream(filePath)
    );

    doc.fontSize(18)
        .text("Resultats", {
            align: "center"
        });

    doc.moveDown();

    titles.forEach(title => {

        doc.fontSize(12)
            .text(title);

        doc.moveDown();

    });

    doc.end();

}

async function runQueries() {

    const uri =
        process.env.MONGODB_URI ||
        'mongodb://root:password@localhost:27017/';

    const client =
        new MongoClient(uri);

    try {

        await client.connect();

        const db =
            client.db("stackexchange");

        const collection =
            db.collection("questions");

        const avgResult =
            await collection.aggregate([
                {
                    $group: {
                        _id: null,
                        avgView: {
                            $avg:
                                "$question.ViewCount"
                        }
                    }
                }
            ]).toArray();

        const avgView =
            avgResult[0].avgView;

        const result1 =
            await collection.find({
                "question.ViewCount": {
                    $gt: avgView
                }
            }).toArray();

        console.log(
            "Consulta 1 resultats:",
            result1.length
        );

        const titles1 =
            result1.map(
                q => q.question.Title
            );

        generatePDF(
            "informe1.pdf",
            titles1
        );

        const words = [
            "pug",
            "wig",
            "yak",
            "nap",
            "jig",
            "mug",
            "zap",
            "gag",
            "oaf",
            "elf"
        ];

        const regex =
            new RegExp(
                words.join("|"),
                "i"
            );

        const result2 =
            await collection.find({
                "question.Title": regex
            }).toArray();

        console.log(
            "Consulta 2 resultats:",
            result2.length
        );

        const titles2 =
            result2.map(
                q => q.question.Title
            );

        generatePDF(
            "informe2.pdf",
            titles2
        );

    } catch (error) {

        console.error(error);

    } finally {

        await client.close();

    }

}

runQueries();
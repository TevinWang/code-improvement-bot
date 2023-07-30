import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";
import fs from 'fs';
import * as path from "node:path";
import { download } from '@guoyunhe/downloader';
import dotenv from 'dotenv'

dotenv.config()
const lancedb = await import("vectordb");


const { pipeline } = await import('@xenova/transformers')
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function read_data(){
    const unstructuredKey = process.env.UNSTRUCTURED_API_KEY
    if (unstructuredKey == null || unstructuredKey == undefined) {
        console.warn(`You need to provide an Unstructured API key, here we read it from the
                    UNSTRUCTURED_API_KEY environment variable. Alternatively you can also host it locally on
                    docker- https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/unstructured `)
    }
    var docs = [];
    const docsPath = "data/python-3.11.4-docs-text"
    const options = {
        apiKey: unstructuredKey,
    };

    var subfolders = fs.readdirSync(docsPath);
    for (let i = 0; i < subfolders.length; i++) {
        const subfolder = docsPath + "/" + subfolders[i];
        console.log(subfolder)
        if (!fs.lstatSync(subfolder).isDirectory()) { continue; }
        if (fs.existsSync(subfolder)) {
            for (const p of fs.readdirSync(subfolder).filter((f) => f.endsWith('.txt'))) {
                const docPath = path.join(subfolder, p);
                console.log(docPath);
                var rawDocument;
                while (true) {
                    try {
                        const loader = new UnstructuredLoader(docPath, options);
                        rawDocument = await loader.load();
                        break;
                    } catch (e) {
                        console.log('Error loading document:', e);
                        console.log('Waiting 50 seconds to retry');
                        await delay(50000);
                    }
                }
                const metadata = {
                    title: subfolders[i],
                    version: '3.11.4',
                };
                rawDocument[0].metadata = Object.assign(rawDocument[0].metadata, metadata);
                rawDocument[0].metadata['source'] = JSON.stringify(rawDocument[0].metadata['source']);
                docs = docs.concat(rawDocument);
            }

        }
    }
    return docs;
};


const embed_fun = {}
embed_fun.sourceColumn = 'text'
embed_fun.embed = async function (batch) {
    let result = []
    for (let text of batch) {
        const res = await pipe(text, { pooling: 'mean', normalize: true })
        result.push(Array.from(res['data']))
    }
    return (result)
};



(async () => {
    const db = await lancedb.connect("data/sample-lancedb")

    await download("https://docs.python.org/3/archives/python-3.11.4-docs-text.zip", "data/", { extract: true })
    var docs = await read_data();
    // make table here
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    docs = await splitter.splitDocuments(docs);
    console.log(docs[0])
    console.log(docs[0]['pageContent'])
    let data = [];
    for (let doc of docs) {
        data.push({text: doc['pageContent'], metadata: doc['metadata']});
    }

    console.log("creating table");
    const _ = await db.createTable("python_docs", data, embed_fun);
    console.log("table created");
})();
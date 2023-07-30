import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fs from 'fs';
import * as path from "node:path";
import { download } from '@guoyunhe/downloader';
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()
const lancedb = await import("vectordb");


const { pipeline } = await import('@xenova/transformers')
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const delay = ms => new Promise(res => setTimeout(res, ms));

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function read_data(){
    const unstructuredKey = process.env.UNSTRUCTURED_API_KEY
    if (unstructuredKey == null || unstructuredKey == undefined) {
        console.warn(`You need to provide an Unstructured API key, here we read it from the
                    UNSTRUCTURED_API_KEY environment variable. Alternatively you can also host it locally on
                    docker- https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/unstructured `)
    }
    var docs = [];
    const docsPath = "data/python-3.11.4-docs-text"

    var subfolders = fs.readdirSync(docsPath);
    for (let i = 0; i < subfolders.length; i++) {
        const subfolder = docsPath + "/" + subfolders[i];
        console.log(subfolder)
        if (!fs.lstatSync(subfolder).isDirectory()) { continue; }
        if (fs.existsSync(subfolder)) {
            for (const p of fs.readdirSync(subfolder).filter((f) => f.endsWith('.txt'))) {
                const docPath = path.join(subfolder, p);
                console.log(docPath);

                var rawDocument = [];
                var output = fs.readFileSync(docPath).toString();
                const prompt = `\n\n${Anthropic.HUMAN_PROMPT}: Your task is to read the following code documentation about a python function and summarize it in a few paragraphs. You should include what the function does and a few examples on how to use it, but leave out any unrelated information that is not about the functionality of it in python. Do not begin or end your response with any notes. Here is the documentation file:\n${output}\n\n${Anthropic.AI_PROMPT}:`
                const completion = await anthropic.completions.create({
                    model: 'claude-2',
                    max_tokens_to_sample: 1500,
                    prompt: prompt,
                });
                rawDocument.push({"text": completion.completion, "metadata": {}});

                const metadata = {
                    title: subfolders[i],
                    version: '3.11.4',
                };
                rawDocument[0].metadata = Object.assign(rawDocument[0].metadata, metadata);
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
        data.push({text: doc['pageContent'], metadata: JSON.stringify(doc['metadata'])});
    }

    console.log("creating table");
    const _ = await db.createTable("python_docs", data, embed_fun);
    console.log("table created");
})();
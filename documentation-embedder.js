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

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function read_data(){

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
                try {
                    var output = fs.readFileSync(docPath).toString();
                    const prompt = `\n\n${Anthropic.HUMAN_PROMPT}: You are to act as a summarizer bot whose task is to read the following code documentation about a python function and summarize it in a few paragraphs without bullet points. You should include what the function does and potentially a few examples on how to use it, in multiple paragraphs, but leave out any unrelated information that is not about the functionality of it in python, including a preface to the response, such as 'Here is a summary...'. \n\nREMEMBER: \nDo NOT begin your response with an introduction. \nMake sure your entire response can fit in a research paper. \nDo not use bullet points. \nKeep responses in paragraph form. \nDo not respond with extra context or your introduction to the reponse.\n\nNow act like the summarizer bot, and follow all instructions. Do not add any additional context or introduction in your response. Here is the documentation file:\n${output}\n\n${Anthropic.AI_PROMPT}:`
                    let completion = await anthropic.completions.create({
                        model: 'claude-2',
                        max_tokens_to_sample: 1000,
                        prompt: prompt,
                    });
                    completion = completion.completion.split(":\n\n").slice(1);
                    completion = completion.join(":\n\n");
                    docs = docs.concat(completion);
                } catch (err) {
                    console.log(err);
                }
            }

        }
    }
    fs.writeFileSync("data/all_python_docs.txt", docs.join("\n\n---\n\n"))
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

    // await download("https://docs.python.org/3/archives/python-3.11.4-docs-text.zip", "data/", { extract: true })
    // var docs = await read_data();
    var docs = fs.readFileSync("data/all_python_docs.txt").toString().split("\n\n---\n\n");

    // make table here
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 250,
        chunkOverlap: 50,
    });
    docs = await splitter.createDocuments(docs);
    console.log(docs[0])
    let data = [];
    for (let doc of docs) {
        data.push({text: doc['pageContent'], metadata: JSON.stringify(doc['metadata'])});
    }

    console.log("creating table");
    const _ = await db.createTable("python_docs", data, embed_fun);
    console.log("table created");
})();
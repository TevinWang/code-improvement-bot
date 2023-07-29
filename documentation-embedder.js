import { LanceDB } from "langchain/vectorstores/lancedb";
import { RetrievalQAChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { UnstructuredLoader,  } from "langchain/document_loaders/fs/unstructured";
import fs from 'fs';
import * as path from "node:path";
import { download } from '@guoyunhe/downloader';
const lancedb = await import("vectordb");

const { pipeline } = await import('@xenova/transformers')
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');


function get_document_title(document) {
    const source = document.metadata.source;
    const regex = /pandas.documentation(.*).html/;
    const title = regex.exec(source);
    if (source | title) {
        console.log("title", title[1]);
        console.log("source", source);
    }
    return title | "";
};

async function read_data(){
    const unstructuredKey = process.env.UNSTRUCTURED_API_KEY
    if (unstructuredKey == null || unstructuredKey == undefined) {
        console.warn(`You need to provide an Unstructured API key, here we read it from the
                    UNSTRUCTURED_API_KEY environment variable. Alternatively you can also host it locally on
                    docker- https://js.langchain.com/docs/modules/indexes/document_loaders/examples/file_loaders/unstructured `)
    }
    var docs = [];
    const docsPath = "pandas_docs/pandas.documentation"
    const options = {
        apiKey: unstructuredKey,
    };

    if (fs.existsSync(docsPath)) {
        for (const p of fs.readdirSync(docsPath).filter((f) => f.endsWith('.html'))) {
            const docPath = path.join(docsPath, p);
            console.log(docPath);
            var rawDocument;
            try {
            const loader = new UnstructuredLoader(docPath, options);
            rawDocument = await loader.load();

            } catch (e) {
                console.log('Error loading document:', e);
                continue;
            }
            const metadata = {
                title: get_document_title(rawDocument[0]),
                version: '2.0rc0',
            };
            rawDocument[0].metadata = Object.assign(rawDocument[0].metadata, metadata);
            rawDocument[0].metadata['source'] = JSON.stringify(rawDocument[0].metadata['source']);
            docs = docs.concat(rawDocument);
        }

    }
    return docs;
};


const embed_fun = {}
embed_fun.sourceColumn = 'text'
embed_fun.embed = async function (text) {
    const res = await pipe(text, { pooling: 'mean', normalize: true })
    return (Array.from(res['data']))
};
embed_fun.embedDocuments = async function (documents) {
    let results = [];
    for (let text of documents) {
        const res = await pipe(text, { pooling: 'mean', normalize: true })
        results.push(Array.from(res['data']));
    }
    return results;
};



(async () => {
    const db = await lancedb.connect("data/sample-lancedb")

    await download("https://eto-public.s3.us-west-2.amazonaws.com/datasets/pandas_docs/pandas.documentation.zip", "pandas_docs", { extract: true })
    var docs = await read_data();
    // make table here
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    docs = await splitter.splitDocuments(docs);
    console.log(docs[0])
    const table = await db.createTable("vectors", [{ vector: await embed_fun.embed("Hello world"), text: "sample", id: "a" },]);

    const vectorStore = await LanceDB.fromDocuments(
        docs,
        embed_fun,
        { table }
    );

})();
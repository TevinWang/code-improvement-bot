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
    process.env.UNSTRUCTURED_API_KEY = "yCzUUQOmrDlayNDCZN58gfASLqzy1a"
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


// Define the function. `sourceColumn` is required for LanceDB to know
// which column to use as input.
const embed_fun = {}
embed_fun.sourceColumn = 'text'
embed_fun.embed = async function (batch) {
    let result = []
    // Given a batch of strings, we will use the `pipe` function to get
    // the vector embedding of each string.
    for (let text of batch) {
        // 'mean' pooling and normalizing allows the embeddings to share the
        // same length.
        const res = await pipe(text, { pooling: 'mean', normalize: true })
        result.push(Array.from(res['data']))
    }
    return (result)
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
    console.log(docs[0]['pageContent'])
    let data = [];
    for (let doc of docs) {
        data.push({text: doc['pageContent'], metadata: doc['metadata']});
    }

    const table = await db.createTable("pandas_docs", data, embed_fun);

})();
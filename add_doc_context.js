const { pipeline } = await import('@xenova/transformers')
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const lancedb = await import("vectordb");


const embed_fun = {}
embed_fun.sourceColumn = 'text'
embed_fun.embed = async function (batch) {
    let result = []
    for (let text of batch) {
        console.log("embedding " + stringify(batch))
        const res = await pipe(text, { pooling: 'mean', normalize: true })
        result.push(Array.from(res['data']))
    }
    return (result)
};


(async () => {
    const db = await lancedb.connect("data/sample-lancedb")
    const table = await db.openTable("python_docs");

    let input = process.argv[2];

    const result = await table.search(input).limit(1).execute();
    console.log(result);
})();
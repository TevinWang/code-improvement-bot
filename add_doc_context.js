const { pipeline } = await import('@xenova/transformers')
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const lancedb = await import("vectordb");


const embed_fun = {}
embed_fun.sourceColumn = 'text'
embed_fun.embed = async function (batch) {
    let result = []
    for (let text of batch) {
        const res = await pipe(text, { pooling: 'mean', normalize: true })
        result.push(Array.from(await res['data']))
    }
    return (result)
};


(async () => {
    const db = await lancedb.connect("data/sample-lancedb")
    const table = await db.openTable("python_docs", embed_fun);

    let input = process.argv[2];
    let results = [];

    input = input.split("|||||");
    for (let i of input) {
        i = i.split("|||");
        let result = await table.search(i[1]).select(['text']).limit(1).execute();
        results.push(result.map(r => r.text).join(", "));
    }

    let response = [];
    for (let i = 0; i < results.length; i++) {
        response.push(input[i] + "|||" + results[i]);
    }

    console.log(response.join("|||||"));
    // expected: line1|||line|||context|||||...

})();
import lancedb

db = lancedb.connect("data/sample-lancedb")
table = db.open_table("pandas_docs")

print(table.to_pandas())
import lancedb

db = lancedb.connect("data/sample-lancedb")
table = db.open_table("python_docs")

print(table.to_pandas().head(50)["text"])
print(table.to_pandas().columns)
print("vector size: " + str(len(table.to_pandas()['vector'].values[0])))

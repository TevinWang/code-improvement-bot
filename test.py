import lancedb

db = lancedb.connect("data/sample-lancedb")
table = db.open_table("python_docs")

print(table.to_pandas())
print("vector size: " + str(len(table.to_pandas()['vector'].values[0])))
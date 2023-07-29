import lancedb

db = lancedb.connect("data/sample-lancedb")
table = db.open_table("vectors")

print(table.to_pandas())
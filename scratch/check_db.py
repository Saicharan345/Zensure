import sqlite3
from pathlib import Path

db_path = Path('backend/zensure.db')
if not db_path.exists():
    print(f"Database not found at {db_path.absolute()}")
else:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    print("WORKERS:")
    for row in conn.execute("SELECT id, name, email, password FROM workers").fetchall():
        print(dict(row))
    print("\nADMINS:")
    for row in conn.execute("SELECT admin_id, email, password FROM admin_accounts").fetchall():
        print(dict(row))
    conn.close()

import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting UK Wind Day-Ahead Procurement Intelligence API on http://{host}:{port} ...")
    uvicorn.run("app:app", host=host, port=port, reload=False)

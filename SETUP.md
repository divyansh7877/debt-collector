# Collections Strategy Management System - Setup Guide

## Quick Setup (5 minutes)

### 1. Prerequisites
- Python 3.8+ ([Download](https://python.org))
- Node.js 16+ ([Download](https://nodejs.org))
- Conda ([Download](https://conda.io))

### 2. Clone & Setup Environment
```bash
git clone <your-github-repo-url>
cd serve_collection
conda create -n serve python=3.9
conda activate serve
pip install -r requirements.txt
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cd ..
```

### 4. Configure AI (Optional)
```bash
# Get OpenAI API key from https://platform.openai.com/api-keys
echo "OPENAI_API_KEY=your-key-here" > .env
```

### 5. Load Sample Data
```bash
python populate_mock_data.py
```

### 6. Run Application
```bash
# Terminal 1 - Backend
conda activate serve
uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 7. Access Application
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

## Environment Variables

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini  # Optional
```

## Troubleshooting

**Backend won't start?**
```bash
conda activate serve
python -c "import fastapi; print('FastAPI installed')"
```

**Frontend won't start?**
```bash
cd frontend
rm -rf node_modules
npm install
```

**Need help?** Check the full README.md for detailed troubleshooting.

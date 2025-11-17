# Quick Start Guide

Get up and running with the Collections Strategy Management System in minutes.

## Prerequisites

- Python 3.x with Conda installed
- Node.js and npm installed

## Setup

### 1. Backend Setup

```bash
# Activate Conda environment
conda activate serve

# Install dependencies (if not already installed)
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Load Mock Data (Optional)

```bash
# From project root
rm test.db  # Remove existing database (optional)
conda run -n serve python populate_mock_data.py
```

## Running the Application

### Start Backend

```bash
# Terminal 1
conda activate serve
uvicorn main:app --reload
```

Backend will be available at `http://localhost:8000`

### Start Frontend

```bash
# Terminal 2
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Quick Tour

### 1. View Users
- Users are displayed in the left sidebar
- Click on any user to view details

### 2. Create a Strategy
- Select a user from the sidebar
- Go to **Strategy Planning** tab
- Click **"AI Generate"** to create a strategy automatically, or
- Click **"+ Action"** to add action blocks manually

### 3. Add Action Blocks
1. Click **"+ Action"** in any timeline column
2. Click the action block to edit
3. Fill in:
   - **Source**: Email / SMS / Call
   - **Tone**: Friendly / Neutral / Firm / Escalation
   - **Content**: Your message
   - **Contact Method Detail**: Select specific contact from user's list
   - **Preferred Contact**: Set preferred method type
4. Click **Save Strategy**

### 4. Add Decision Blocks
1. Click **"+ Decision"** in any timeline column
2. Click the purple decision block to edit
3. Fill in:
   - **Decision Prompt**: What condition to check?
     - Example: "Check if user responded to last email"
   - **Data Sources**: Comma-separated data sources
     - Example: "email_log, payment_history"
4. Click **Save Strategy**

## Timeline Columns

The strategy timeline has 6 columns representing different stages:

| Days | Color | Urgency | Typical Tone |
|------|-------|---------|--------------|
| 1-7 | 🟢 Green | Low | Friendly |
| 8-14 | 🟢 Light Green | Low-Medium | Neutral |
| 15-30 | 🟡 Yellow | Medium | Firm |
| 31-50 | 🟠 Orange | Medium-High | Firm |
| 51-90 | 🟠 Deep Orange | High | Escalation |
| 90+ | 🔴 Red | Critical | Escalation |

## Example Strategy

```
Day 1-7:    📧 Email (Preferred) - Friendly reminder
Day 8-14:   📧 Email (Preferred) - Follow-up
            ↓
        [🧠 Decision: Did they respond?]
            ↓
    ┌──────┴──────┐
   YES            NO
    │              │
Day 31-50:    Day 15-30:
Thank you     📞 Phone Call - Firm
```

## Common Tasks

### Upload User Data
1. Click **Upload** button in header
2. Select Excel (.xlsx, .xls) or PDF file
3. For Excel: First row should contain column headers (requires "name" column)
4. For PDF: Provide user_id or create new user

### View Analytics
- Analytics are displayed in the left sidebar
- Shows counts by status and average overdue days

### Update User Status
- Click on a user
- Change status: `pending` → `ongoing` → `finished`

## Troubleshooting

### Backend won't start
- Ensure Conda environment is activated: `conda activate serve`
- Check if port 8000 is available
- Verify dependencies: `pip install -r requirements.txt`

### Frontend won't start
- Check if Node.js is installed: `node --version`
- Install dependencies: `cd frontend && npm install`
- Check if port 3000 is available

### Contact methods not appearing
- Verify user has `contact_methods` in details
- Reload database: `rm test.db && conda run -n serve python populate_mock_data.py`

### Decision blocks not showing
- Restart backend server
- Clear browser cache and reload
- Check browser console for errors

## Next Steps

- Explore the API documentation at `http://localhost:8000/docs`
- Read the full README.md for detailed information
- Experiment with different strategy templates
- Test AI generation with xAI API key (optional)

## Need Help?

- Check API documentation: `http://localhost:8000/docs`
- Review README.md for architecture and tech stack details
- Check browser console and backend logs for errors

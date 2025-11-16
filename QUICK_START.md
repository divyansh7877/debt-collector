# Quick Start Guide - New Features

## What's New?

### ✨ AI Decision Blocks
Add intelligent decision logic between your action blocks to create dynamic collection strategies.

### ✨ Enhanced Contact Details
Specify exactly which phone number or email to use for each action, with preferred contact indicators.

## Getting Started

### 1. Start the Application

```bash
# Terminal 1 - Backend
conda activate serve
uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Load Mock Data

The database already contains users with contact information. To reset:

```bash
rm test.db
conda run -n serve python populate_mock_data.py
```

## Using Decision Blocks

### Add a Decision Block

1. Select a user (e.g., "Div")
2. Go to **Strategy Planning** tab
3. Click **"+ Decision"** button in any timeline column
4. Click the purple decision block to edit
5. Fill in:
   - **Decision Prompt**: What condition to check?
     - Example: "Check if user responded to last email"
   - **Data Sources**: What data to use? (comma-separated)
     - Example: "email_log, payment_history"
6. Click **Save Strategy**

### Example Decision Prompts

- "Has user made any payment in last 7 days?"
- "Did user respond to previous communication?"
- "Is outstanding amount less than ₹5000?"
- "Has user requested payment plan?"

## Using Enhanced Contact Details

### Add Action Block with Contact Details

1. Click **"+ Action"** button
2. Click the action block to edit
3. Fill in basic details:
   - **Source**: Email / SMS / Call
   - **Tone**: Friendly / Neutral / Firm / Escalation
   - **Content**: Your message
4. **New!** Select specific contact:
   - **Contact Method Detail**: Choose from user's contact list
     - Shows all emails/phones with labels
     - ⭐ indicates preferred contact
5. **New!** Set **Preferred Contact**: Email / Phone / SMS
6. Click **Save Strategy**

### Example Workflow

```
User: Div
Contact Methods:
- Primary Email: div@example.com ⭐
- Mobile: +91-98765-43210
- Office: +91-98765-43211

Strategy:
┌─────────────────────────────┐
│ Day 1-7                     │
├─────────────────────────────┤
│ 📧 Email - Friendly         │
│ "Gentle payment reminder"   │
│ Via: div@example.com ⭐      │
└─────────────────────────────┘
```

## Strategy Planning Tips

### 🎯 Best Practices for Decision Blocks

1. **Place between key stages**: 
   - After initial contact → Before escalation
   - After multiple attempts → Before final notice

2. **Use relevant data sources**:
   - `payment_history` - Check payment patterns
   - `communication_log` - Track responses
   - `user_profile` - Use demographic info

3. **Define clear outcomes**:
   - What happens if condition is TRUE?
   - What happens if condition is FALSE?
   - Which timeline column to jump to?

### 📞 Contact Method Strategy

1. **Start with preferred method** (marked with ⭐)
2. **Escalate to alternative methods** if no response
3. **Use multiple channels** for urgent matters

### Example Multi-Channel Strategy

```
Day 1-7:   Email (Preferred) → Friendly
Day 8-14:  SMS (Alternative) → Neutral
           ↓
        [Decision: Did they respond?]
           ↓
    ┌──────┴──────┐
   YES            NO
    │              │
Day 15-30:    Day 15-30:
Thank you     Phone Call (Direct) → Firm
```

## Visual Indicators

### Block Types

| Visual | Type | Description |
|--------|------|-------------|
| 📧/📞/💬 + Color chip | Action Block | Execute communication |
| 🧠 + Purple gradient | Decision Block | Evaluate condition |
| ⭐ Star chip | Preferred Contact | User's preferred method |

### Color Coding (Timeline Columns)

| Days | Color | Urgency | Tone |
|------|-------|---------|------|
| 1-7 | 🟢 Green | Low | Friendly |
| 8-14 | 🟢 Light Green | Low-Medium | Neutral |
| 15-30 | 🟡 Yellow | Medium | Firm |
| 31-50 | 🟠 Orange | Medium-High | Firm |
| 51-90 | 🟠 Deep Orange | High | Escalation |
| 90+ | 🔴 Red | Critical | Escalation |

## Keyboard Shortcuts

- Click any block → Opens editor drawer
- Drag & drop blocks → Reorder within/between columns
- Click outside drawer → Close without saving

## Sample Strategy Templates

### 1. Gentle Escalation (Preferred Contact Focused)

```
Day 1-7:    Email (Preferred) - Friendly reminder
Day 8-14:   Email (Preferred) - Follow-up
[Decision: Check if user opened emails]
  → YES: Day 31-50 (Phone call - offer help)
  → NO: Day 15-30 (SMS - alternate channel)
```

### 2. Multi-Touch Approach

```
Day 1-7:    Email - Initial contact
Day 8-14:   SMS - Quick reminder
[Decision: Any payment received?]
  → YES: Day 31-50 (Thank you email)
  → NO: Day 15-30 (Phone call - discuss plan)
Day 31-50:  Email - Final notice
[Decision: Response to final notice?]
  → YES: Day 51-90 (Payment plan setup)
  → NO: Day 90+ (Escalate to legal)
```

### 3. Quick Resolution Path

```
Day 1-7:    Email (Preferred) - Payment due reminder
[Decision: Full payment received?]
  → YES: DONE (Send receipt)
  → NO: Continue
Day 8-14:   Phone + Email - Payment options
[Decision: Partial payment or commitment?]
  → YES: Day 31-50 (Set up plan)
  → NO: Day 15-30 (Firm notice)
```

## Troubleshooting

### Decision Block Not Showing?

- Make sure backend is updated (restart server)
- Check that timeline has blocks with `block_type: "decision"`
- Clear browser cache and reload

### Contact Methods Not Appearing?

- Verify user has `contact_methods` in details
- Check user data with: `curl http://localhost:8000/users/1`
- Reload database: `rm test.db && python populate_mock_data.py`

### Can't Edit Blocks?

- Ensure drawer is open (click on a block)
- Check console for JavaScript errors
- Verify Redux state is updating

## Next Steps

1. **Experiment** with different decision points
2. **Test** contact preferences with real users
3. **Analyze** which strategies work best
4. **Refine** based on actual response rates

## Need Help?

Check the detailed documentation:
- `FEATURE_DECISION_BLOCKS.md` - Complete technical details
- `CHANGES.md` - Summary of all changes
- `WARP.md` - Project architecture guide

---

**Pro Tip**: Start with the AI Generate button to see an example strategy with decision blocks, then customize it for your needs!

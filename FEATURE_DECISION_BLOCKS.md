# AI Decision Blocks & Enhanced Execution Details

## Overview

This document describes the new features added to the Collections Strategy system:

1. **AI Decision Blocks**: Conditional logic blocks that sit between action blocks in the strategy timeline
2. **Enhanced Execution Blocks**: Detailed contact method selection with preferred contact options

## Features

### 1. AI Decision Blocks

Decision blocks allow strategy planners to add conditional logic between action blocks. These blocks:

- **Evaluate conditions** based on user data (payment history, communication logs, etc.)
- **Branch to different outcomes** based on the evaluation
- **Connect timeline stages** with intelligent decision-making

#### Decision Block Structure

```json
{
  "block_type": "decision",
  "decision_prompt": "Check if user has made any partial payment or contacted us",
  "decision_sources": ["payment_history", "communication_log"],
  "decision_outputs": [
    {
      "condition": "If partial payment received",
      "next_timing": "Day 31-50",
      "action": "Send thank you and payment plan"
    },
    {
      "condition": "If no response",
      "next_timing": "Day 31-50",
      "action": "Escalate to phone call"
    }
  ]
}
```

#### Visual Representation

Decision blocks are displayed with:
- Purple gradient background
- 🧠 Psychology icon
- Number of data sources
- Number of possible outcomes
- Distinct from action blocks

### 2. Enhanced Action Blocks

Action blocks now support detailed contact method selection:

#### Enhanced Fields

1. **Contact Method Detail**: Select specific contact info
   - Primary Email: user@example.com ⭐
   - Mobile: +91-98765-43210
   - Office: +91-98765-43211

2. **Preferred Contact**: Set user's preferred method
   - Email
   - Phone
   - SMS

#### Action Block Structure

```json
{
  "block_type": "action",
  "source": "email",
  "tone": "firm",
  "content": "Payment reminder message",
  "contact_method_detail": "div@example.com",
  "preferred_contact": "email"
}
```

## Backend Changes

### 1. Updated Schemas (`app/schemas.py`)

**New Types:**
- `BlockTypeLiteral`: "action" | "decision"
- `ContactMethodDetail`: Contact information structure
- `DecisionOutput`: Decision outcome structure

**Enhanced StrategyBlock:**
```python
class StrategyBlock(BaseModel):
    block_type: BlockTypeLiteral = "action"
    
    # Action fields
    source: Optional[str] = None
    tone: Optional[str] = None
    content: Optional[str] = None
    contact_method_detail: Optional[str] = None
    preferred_contact: Optional[str] = None
    
    # Decision fields
    decision_prompt: Optional[str] = None
    decision_sources: Optional[List[str]] = None
    decision_outputs: Optional[List[DecisionOutput]] = None
```

### 2. Updated Strategy Generation (`app/routers_strategies.py`)

The default timeline now includes an example decision block in Day 15-30:

```python
{
    "timing": "Day 15-30",
    "blocks": [
        {
            "block_type": "action",
            "source": "email",
            "tone": "firm",
            "content": "Important: Payment is now overdue...",
            "preferred_contact": "email",
        },
        {
            "block_type": "decision",
            "decision_prompt": "Check if user has made any partial payment...",
            "decision_sources": ["payment_history", "communication_log"],
            "decision_outputs": [...]
        }
    ]
}
```

### 3. Updated Mock Data (`populate_mock_data.py`)

Users now have contact information:

```python
"contact_methods": [
    {
        "method": "email",
        "value": "div@example.com",
        "label": "Primary Email",
        "is_preferred": True
    },
    {
        "method": "phone",
        "value": "+91-98765-43210",
        "label": "Mobile",
        "is_preferred": False
    }
],
"preferred_contact": "email"
```

## Frontend Changes

### 1. New Component: `DecisionBlockCard.jsx`

Displays decision blocks with:
- Purple gradient styling
- Brain icon (Psychology)
- Decision prompt
- Source count
- Output count

### 2. Enhanced Component: `BlockCard.jsx`

Action blocks now show:
- Source icons (Email, Phone, SMS)
- Preferred contact indicator (⭐)
- Contact method detail ("Via: email@example.com")

### 3. Updated Component: `StrategyPlanning.jsx`

**Key Changes:**
- Added "+ Action" and "+ Decision" buttons to each column
- Renders `DecisionBlockCard` for decision blocks
- Renders `BlockCard` for action blocks
- Fetches user details for contact methods
- Enhanced drawer (400px width) with conditional editing:
  - **Decision Block Editor**: 
    - Decision prompt (multiline)
    - Data sources (comma-separated)
    - Outputs/conditions section
  - **Action Block Editor**:
    - Source, Tone, Content (existing)
    - Contact Method Detail dropdown (populated from user data)
    - Preferred Contact dropdown

## User Workflow

### Creating a Decision Block

1. Click "+ Decision" button in any timeline column
2. Edit the decision block:
   - Enter decision prompt/logic
   - Add data sources (comma-separated)
   - Define possible outcomes
3. Save strategy

### Creating an Action Block with Contact Details

1. Click "+ Action" button in any timeline column
2. Edit the action block:
   - Select source (Email/SMS/Call)
   - Choose tone (Friendly/Neutral/Firm/Escalation)
   - Write content
   - **Select specific contact method** from user's contact list
   - **Set preferred contact** type
3. Save strategy

### Example Strategy Flow

```
Day 15-30:
┌─────────────────────────┐
│ 📧 Email - Firm         │
│ "Payment overdue..."    │
│ Via: div@example.com ⭐  │
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ 🧠 AI Decision          │
│ Check payment status    │
│ 2 sources, 2 outcomes   │
└─────────────────────────┘
           ↓
     ┌────┴────┐
     │         │
    YES       NO
     │         │
Day 31-50  Day 31-50
(Thank you) (Escalate)
```

## Testing

### Backend Test

```bash
# Test strategy generation
curl -X POST "http://localhost:8000/strategies/1/ai-generate?owner_type=user" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create collection strategy"}'
```

### Frontend Test

1. Start backend: `conda run -n serve uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Select user "Div" from sidebar
4. Go to "Strategy Planning" tab
5. Click "AI Generate" to see decision block in Day 15-30
6. Click "+ Decision" to add new decision blocks
7. Click on blocks to edit with enhanced options

## Data Model

### User Details Schema

```json
{
  "name": "Div",
  "type_of_service": "Spider Control",
  "cost": 10000,
  "amount_owed": 6500,
  "contact_methods": [
    {
      "method": "email",
      "value": "div@example.com",
      "label": "Primary Email",
      "is_preferred": true
    },
    {
      "method": "phone",
      "value": "+91-98765-43210",
      "label": "Mobile",
      "is_preferred": false
    }
  ],
  "preferred_contact": "email"
}
```

## Future Enhancements

1. **Dynamic Decision Execution**: Actually evaluate decision logic during execution
2. **Decision Block Templates**: Pre-built decision patterns
3. **Contact Method Validation**: Verify email/phone format
4. **Communication History Tracking**: Log which contact methods were used
5. **A/B Testing**: Test different decision paths
6. **Visual Flow Editor**: Drag-and-drop decision tree builder

## API Changes Summary

### New Fields in Strategy Block

| Field | Type | Description | Block Type |
|-------|------|-------------|------------|
| `block_type` | string | "action" or "decision" | Both |
| `contact_method_detail` | string | Specific contact value | Action |
| `preferred_contact` | string | Preferred method type | Action |
| `decision_prompt` | string | Decision logic description | Decision |
| `decision_sources` | array | Data sources to evaluate | Decision |
| `decision_outputs` | array | Possible outcomes | Decision |

### Backward Compatibility

- Existing blocks without `block_type` default to "action"
- All new fields are optional
- Existing strategies continue to work without modifications

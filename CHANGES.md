# Changes Summary

## Date: 2025-11-15

### 1. Extended Strategy Timeline (Kanban Columns)

**Backend Changes:**
- **File:** `app/routers_strategies.py`
  - Extended `_build_default_timeline()` function to include 6 columns instead of 3:
    - Day 1-7 (Friendly tone)
    - Day 8-14 (Neutral tone)
    - Day 15-30 (Firm tone)
    - **Day 31-50 (Firm tone)** ← NEW
    - **Day 51-90 (Escalation tone)** ← NEW
    - **Day 90+ (Escalation tone)** ← NEW

**Frontend Changes:**
- **File:** `frontend/src/components/StrategyPlanning.jsx`
  - Updated `DEFAULT_COLUMNS` array to include 6 columns: `['Day 1-7', 'Day 8-14', 'Day 15-30', 'Day 31-50', 'Day 51-90', 'Day 90+']`
  - Added `COLUMN_COLORS` array with gradient colors from green to red:
    - Day 1-7: Green (rgba(76, 175, 80, 0.15))
    - Day 8-14: Light Green (rgba(139, 195, 74, 0.15))
    - Day 15-30: Yellow (rgba(255, 235, 59, 0.15))
    - Day 31-50: Orange (rgba(255, 152, 0, 0.15))
    - Day 51-90: Deep Orange (rgba(255, 87, 34, 0.15))
    - Day 90+: Red (rgba(244, 67, 54, 0.15))
  - Updated column styling to use the color gradient with border colors matching urgency level

### 2. Fixed Analytics Endpoint

**Backend Changes:**
- **File:** `app/routers_users.py`
  - **Issue:** The `/users/analytics` endpoint was being incorrectly matched by the `/users/{id}` route because FastAPI matches routes in order
  - **Solution:** Moved the `/users/analytics` route definition BEFORE the `/users/{id}` route
  - Routes are now ordered:
    1. `GET /users/` - List all entities
    2. `GET /users/analytics` - Get analytics ← MOVED UP
    3. `POST /users/group` - Create group
    4. `GET /users/{id}` - Get specific entity
    5. `PATCH /users/{id}/status` - Update status

**Result:** Analytics endpoint now works correctly and returns:
```json
{
  "counts_by_status": {
    "pending": 3,
    "ongoing": 4,
    "finished": 1
  },
  "avg_overdue_days": 33.8,
  "total_users": 8
}
```

### 3. Mock Data Added

**File:** `populate_mock_data.py` (NEW)
- Created script to populate database with 8 mock users
- Users have various pest control services (Spider Control, Termite Treatment, etc.)
- Data includes:
  - Service type and area
  - Cost and amount owed
  - Due dates
  - Payment history (multiple partial payments)
  - Overdue status
  - Different collection statuses (pending/ongoing/finished)

## Testing

To test the changes:

1. **Backend:** Ensure server is running with `conda run -n serve uvicorn main:app --reload`
2. **Analytics:** Visit frontend and check the left sidebar for analytics chart
3. **Strategy Timeline:** 
   - Select a user
   - Go to "Strategy Planning" tab
   - Click "AI Generate" to see all 6 columns with gradient colors
   - Notice the color progression from green (early stages) to red (late/critical stages)

## Visual Changes

The kanban board now visually communicates urgency through color:
- **Early stages (1-14 days):** Green tones - friendly/neutral approach
- **Middle stages (15-50 days):** Yellow to orange - firm approach needed
- **Late stages (51-90+ days):** Orange to red - escalation required

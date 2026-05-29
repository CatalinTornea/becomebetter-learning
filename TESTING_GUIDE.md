# 🧪 Testing Guide - AdaptiveOps Platform

Ghid complet pentru testarea funcționalităților.

## ✅ Pre-requisite: Setup Complete

Asigură-te că ai:
1. ✅ `npm install` completat
2. ✅ `.env` configurat cu ANTHROPIC_API_KEY
3. ✅ `npm run prisma:migrate` și `npm run prisma:seed` rulate
4. ✅ `npm run dev` running
5. ✅ Frontend accessible la http://localhost:3000
6. ✅ Backend running pe http://localhost:4000

## 🧑‍🎓 Test 1: Student Practice Flow

### Setup
- Clear browser cookies/cache
- Open http://localhost:3000

### Steps

1. **Login**
   - Click "Sign In"
   - Email: `student@adaptiveops.io`
   - Password: `student1234`
   - ✅ Should see dashboard

2. **Navigate to Practice**
   - Click "Practice" nav link
   - ✅ Should see "Practice - Problem-Solving Scenarios"
   - ✅ Should see module selector
   - ✅ Should see "Problem-Solving Fundamentals" module

3. **Select Scenario**
   - Click on module button if not selected
   - ✅ Should see "Rebut la linia de asamblare" scenario card
   - Click scenario card
   - ✅ Redirects to `/scenarios/[id]`

4. **View Scenario**
   - ✅ Title visible: "Rebut la linia de asamblare"
   - ✅ Left panel shows coaching materials
   - ✅ Right panel shows problem statement
   - ✅ Rubrics displayed:
     - "IMPACT Assessment"
     - "Root Cause Identification"
     - "Corrective Action"
     - "Communication Plan"
   - ✅ Response textarea visible
   - ✅ "Submit for AI Evaluation" button visible

5. **Submit Response**
   ```
   RESPONSE TO SUBMIT (min 10 words):
   
   "First, I need to isolate the quality issue and contain it. 
   The 50 defective parts must be segregated immediately. 
   Then I'll notify the customer within 2 hours as per SLA. 
   I'll investigate if tool change is needed on station 5."
   ```
   - Type response above
   - Click "Submit for AI Evaluation"
   - ✅ Button should show "Evaluating..."
   - ✅ After 30-60 sec, feedback appears

6. **View Feedback**
   - ✅ "🎯 AI Evaluation Results" section appears
   - ✅ Overall Score displayed (0-100)
   - ✅ Four rubric evaluations visible:
     - Each with name, score, and feedback
   - ✅ "Coach's Notes" section with general feedback
   - ✅ Scores are reasonable (20-100 range)

### Expected Behavior

- **First submit**: Takes 30-60 seconds (Claude API latency)
- **Second submit**: Same response scores might vary slightly
- **Feedback quality**: Should address:
  - Containment acknowledgment
  - Root cause analysis mention
  - Communication plan
  - Prevention measures

---

## 🏫 Test 2: Coach Scenario Creation

### Setup
- Clear cookies
- Open http://localhost:3000

### Steps

1. **Login as Coach**
   - Click "Sign In"
   - Email: `coach@adaptiveops.io`
   - Password: `coach1234`
   - ✅ Should see dashboard

2. **Navigate to Courses**
   - Click "Courses" (or admin section if available)
   - ✅ Should see course list
   - ✅ "Operational Excellence" course visible

3. **Create New Scenario** (if UI supports)
   - Look for "Add Scenario" or "+" button
   - If present:
     - Title: "New Test Scenario"
     - Problem: "Write at least 20 characters..."
     - Add 2-3 rubrics
     - Click Save
   - ✅ Should see confirmation

---

## 📊 Test 3: API Direct Testing

### Test Health Endpoint
```bash
curl http://localhost:4000/health
# Expected: {"status":"ok"}
```

### Test Get Scenario
```bash
# First, get token (need to be logged in frontend)
# Then use token:

curl http://localhost:4000/scenarios/[SCENARIO_ID] \
  -H "Authorization: Bearer [YOUR_TOKEN]"
```

### Test Submit Response (with cURL)
```bash
curl -X POST http://localhost:4000/scenarios/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "scenarioId": "[SCENARIO_ID]",
    "response": "This is my comprehensive response to the problem. It addresses all the key points and demonstrates problem-solving skills."
  }'
```

Expected response:
```json
{
  "response": { "id": "...", "overallScore": 75, "isGraded": true, ... },
  "grading": {
    "overallScore": 75,
    "rubricEvaluations": [
      { "name": "IMPACT Assessment", "score": 80, "feedback": "..." }
    ],
    "generalFeedback": "..."
  }
}
```

---

## 🐛 Test 4: Error Scenarios

### Error: Response Too Short
- Submit response with < 10 words
- ✅ Should show error: "Please write a response"

### Error: Invalid Scenario ID
- Manually visit `/scenarios/invalid-uuid`
- ✅ Should show "Scenario not found"

### Error: No Authorization
```bash
curl http://localhost:4000/scenarios/[SCENARIO_ID]
# Expected: 401 Unauthorized
```

### Error: Invalid Token
```bash
curl http://localhost:4000/scenarios/[SCENARIO_ID] \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Unauthorized
```

---

## 📱 Test 5: Responsive Design

### Desktop (1920x1080)
- ✅ Two-column layout visible
- ✅ Coaching panel on left, scenario on right
- ✅ All controls visible

### Tablet (768x1024)
- Resize browser to 768px width
- ✅ Layout should adapt
- ✅ Still readable

### Mobile (375x667)
- Resize browser to 375px width
- ✅ Single column layout
- ✅ All controls accessible
- ✅ No horizontal scroll

---

## 🚀 Test 6: Performance

### Scenario Load Time
- Open scenario page
- Check browser DevTools Network tab
- ✅ Should load < 2 seconds

### AI Evaluation Time
- Submit response
- Time from click to feedback display
- ✅ Should be 30-90 seconds (normal for Claude)

### Database Queries
- Open browser DevTools
- Check Network tab
- ✅ Requests should be < 500ms (except AI eval)

---

## 🔐 Test 7: Security

### JWT Validation
```bash
# Try to access protected endpoint without token
curl http://localhost:4000/scenarios/[ID]
# Expected: 401 Unauthorized
```

### CORS Check
- Frontend on http://localhost:3000
- Backend on http://localhost:4000
- ✅ Requests should succeed (CORS enabled)

### SQL Injection Test
- In response textarea, try to submit: `'); DROP TABLE users; --`
- ✅ Should be treated as normal text (parameterized queries)

---

## 📊 Test 8: Data Persistence

### Submit Multiple Responses
1. Submit response #1 → Get score
2. Go back, submit different response
3. ✅ New score should be calculated
4. ✅ Old response should still be accessible

### Check Database
```bash
# View data in Prisma Studio
npm run prisma:studio
# Navigate to ScenarioResponse table
# ✅ Should see all submitted responses with scores
```

---

## ✅ Checklist: All Tests Passing

- [ ] Student can login
- [ ] Student can see scenarios
- [ ] Student can submit response
- [ ] AI returns valid feedback
- [ ] Feedback displays in UI
- [ ] Scores are saved to database
- [ ] Error messages show correctly
- [ ] Responsive design works
- [ ] Security checks pass
- [ ] Performance is acceptable

---

## 🆘 If Tests Fail

### Frontend Issues
- Check browser console (F12 → Console)
- Check `NEXT_PUBLIC_API_URL` in .env
- Verify backend is running

### Backend Issues
- Check terminal where `npm run dev` runs
- Look for API errors
- Verify `ANTHROPIC_API_KEY` is set

### AI Evaluation Not Working
- Check ANTHROPIC_API_KEY in .env
- Verify Claude API quota not exceeded
- Response must be > 10 characters
- Check backend logs for errors

### Database Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# Or check with Prisma
npm run prisma:studio
```

---

## 📈 Example Test Results

### Good Response Evaluation
```
INPUT:
"First, I need to contain the issue by segregating all 50 defective parts. 
Then notify the customer within our 2-hour SLA. I'll conduct RCA using 5 Why 
methodology to identify if it's a tool issue or process drift."

OUTPUT SCORES:
- IMPACT Assessment: 85/100
- Root Cause ID: 80/100
- Corrective Action: 75/100
- Communication Plan: 70/100
OVERALL: 77.5/100

✅ GOOD - Shows understanding of containment, urgency, and RCA
```

### Poor Response Evaluation
```
INPUT:
"Just stop the machine and call maintenance."

OUTPUT SCORES:
- IMPACT Assessment: 30/100
- Root Cause ID: 20/100
- Corrective Action: 25/100
- Communication Plan: 15/100
OVERALL: 22.5/100

❌ POOR - No analysis, ignores SLA, no communication planning
```

---

**Status**: Ready for testing! Start with Test 1 (Student Practice Flow) and work through each test systematically.

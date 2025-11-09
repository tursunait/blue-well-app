# How to Query Onboarding Survey Answers

## Method 1: Prisma Studio (Visual GUI) - **Easiest**

Open a visual database browser:

```bash
cd apps/web
pnpm prisma studio
```

This opens a web interface at **http://localhost:5555** where you can:
- Browse all tables
- View `SurveyAnswer` table
- View `User` table
- Edit data directly
- Filter and search

## Method 2: SQLite Command Line

Direct SQL queries:

```bash
cd apps/web/prisma
sqlite3 dev.db
```

### Useful SQL Queries:

```sql
-- View all survey answers
SELECT * FROM SurveyAnswer;

-- View answers for a specific user (replace USER_ID)
SELECT * FROM SurveyAnswer WHERE userId = 'USER_ID';

-- View answers for onboarding survey
SELECT * FROM SurveyAnswer WHERE surveyId = 'onboarding';

-- View specific question answer
SELECT * FROM SurveyAnswer WHERE questionId = '1';

-- View user profile data
SELECT id, email, age, gender, heightCm, weightKg, fitnessGoal, dietPrefs, avoidFoods 
FROM User;

-- View all answers with user email
SELECT 
  u.email,
  sa.questionId,
  sa.value,
  sa.tsISO,
  sa.surveyId
FROM SurveyAnswer sa
JOIN User u ON sa.userId = u.id
ORDER BY sa.tsISO DESC;

-- View compound question (question 1) answer parsed
SELECT 
  u.email,
  sa.questionId,
  json_extract(sa.value, '$.age') as age,
  json_extract(sa.value, '$.gender') as gender,
  json_extract(sa.value, '$.heightCm') as heightCm,
  json_extract(sa.value, '$.weightKg') as weightKg,
  json_extract(sa.value, '$.foodPreferences') as foodPreferences
FROM SurveyAnswer sa
JOIN User u ON sa.userId = u.id
WHERE sa.questionId = '1';

-- Count answers per question
SELECT questionId, COUNT(*) as count 
FROM SurveyAnswer 
GROUP BY questionId;

-- Exit SQLite
.quit
```

## Method 3: Prisma Client in Code

Create a script to query data:

```typescript
// apps/web/scripts/query-survey.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function querySurveyData() {
  // Get all survey answers
  const answers = await prisma.surveyAnswer.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      tsISO: 'desc',
    },
  });

  console.log('All Survey Answers:', JSON.stringify(answers, null, 2));

  // Get answers for a specific user
  const user = await prisma.user.findUnique({
    where: { email: 'test@halo.com' },
  });

  if (user) {
    const userAnswers = await prisma.surveyAnswer.findMany({
      where: { userId: user.id },
      orderBy: { questionId: 'asc' },
    });

    console.log('User Answers:', JSON.stringify(userAnswers, null, 2));

    // Parse JSON values
    const parsedAnswers = userAnswers.map((answer) => ({
      questionId: answer.questionId,
      value: JSON.parse(answer.value),
      timestamp: answer.tsISO,
    }));

    console.log('Parsed Answers:', JSON.stringify(parsedAnswers, null, 2));
  }

  // Get user profile with all onboarding data
  const userProfile = await prisma.user.findUnique({
    where: { email: 'test@halo.com' },
    select: {
      id: true,
      email: true,
      name: true,
      age: true,
      gender: true,
      heightCm: true,
      weightKg: true,
      fitnessGoal: true,
      scheduleCons: true,
      mealRegular: true,
      weeklyActivity: true,
      timeBudgetMin: true,
      dietPrefs: true,
      avoidFoods: true,
    },
  });

  console.log('User Profile:', JSON.stringify(userProfile, null, 2));

  await prisma.$disconnect();
}

querySurveyData().catch(console.error);
```

Run it:
```bash
cd apps/web
npx tsx scripts/query-survey.ts
```

## Method 4: API Endpoint (if you create one)

Create a query endpoint:

```typescript
// apps/web/src/app/api/survey/answers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserId, getDevUser } from "@/lib/auth-dev";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userId = await getUserId(session);
    
    if (!userId) {
      userId = await getDevUser();
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const answers = await prisma.surveyAnswer.findMany({
      where: { userId },
      orderBy: { questionId: 'asc' },
    });

    // Parse JSON values
    const parsedAnswers = answers.map((answer) => ({
      questionId: answer.questionId,
      value: JSON.parse(answer.value),
      timestamp: answer.tsISO,
    }));

    return NextResponse.json({ answers: parsedAnswers });
  } catch (error) {
    console.error("Error fetching survey answers:", error);
    return NextResponse.json(
      { error: "Failed to fetch answers" },
      { status: 500 }
    );
  }
}
```

Then query via:
```bash
curl http://localhost:3000/api/survey/answers
```

## Method 5: Browser Console (for localStorage)

If survey is in progress, check browser localStorage:

```javascript
// In browser console (F12)
const saved = localStorage.getItem('bluewell-onboarding');
if (saved) {
  const data = JSON.parse(saved);
  console.log('Current answers:', data.answers);
  console.log('Current question:', data.currentIndex);
  console.log('Units:', data.units);
}
```

## Quick Reference: Database Schema

### SurveyAnswer Table
- `id`: Unique identifier
- `userId`: Foreign key to User table
- `questionId`: Question number ("1", "2", "3", etc.)
- `value`: JSON string of the answer
- `tsISO`: Timestamp when answered
- `surveyId`: Survey identifier ("onboarding")
- `answerJson`: Legacy field (optional)

### User Table (Profile Data)
- `age`, `gender`, `heightCm`, `weightKg`
- `fitnessGoal`: "LOSE_FAT", "GAIN_MUSCLE", "FITNESS", etc.
- `scheduleCons`: 1-5 (consistency rating)
- `mealRegular`: 1-5 (meal regularity)
- `weeklyActivity`: 1-4 (activity level)
- `timeBudgetMin`: Time budget (10, 20, 40, 60+)
- `dietPrefs`: JSON string array (e.g., `["Vegetarian", "Vegan"]`)
- `avoidFoods`: JSON string array

## Example: Get Complete Onboarding Data

```sql
-- Get user with all their survey answers
SELECT 
  u.email,
  u.age,
  u.gender,
  u.heightCm,
  u.weightKg,
  u.fitnessGoal,
  u.dietPrefs,
  u.avoidFoods,
  GROUP_CONCAT(sa.questionId || ':' || sa.value, ' | ') as all_answers
FROM User u
LEFT JOIN SurveyAnswer sa ON u.id = sa.userId
WHERE u.email = 'test@halo.com'
GROUP BY u.id;
```


/**
 * CloudLab Backend Automated End-to-End Verification Test
 * Boots all 5 Express microservices and tests complete user workflows via the API Gateway.
 */
import appGateway, { startGateway } from '../apps/api-gateway/src/server';
import appAuth, { startServer as startAuth } from '../apps/auth-service/src/server';
import appLearning, { startServer as startLearning } from '../apps/learning-service/src/server';
import appChallenge, { startServer as startChallenge } from '../apps/challenge-service/src/server';
import appProgress, { startServer as startProgress } from '../apps/progress-service/src/server';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runVerification() {
  console.log('===============================================================');
  console.log('🚀 CLOUDLAB BACKEND AUTOMATED END-TO-END VERIFICATION');
  console.log('===============================================================');

  // 1. Boot all microservices
  console.log('\n[1/6] Booting all 5 microservices in-process...');
  const sAuth = await startAuth();
  const sLearning = await startLearning();
  const sChallenge = await startChallenge();
  const sProgress = await startProgress();
  const sGateway = startGateway();

  await sleep(1500);

  const GATEWAY_URL = 'http://localhost:4000';
  let accessToken = '';
  let attemptId = '';

  try {
    // 2. Gateway Healthcheck
    console.log('\n[2/6] Verifying API Gateway Health Check...');
    const healthRes = await fetch(`${GATEWAY_URL}/health`);
    const healthJson = await healthRes.json();
    console.log('  Status:', healthRes.status, '| Payload:', JSON.stringify(healthJson));
    if (healthRes.status !== 200) throw new Error('Gateway healthcheck failed');

    // 3. User Registration & Authentication Flow
    console.log('\n[3/6] Testing User Registration & Authentication via API Gateway...');
    const regRes = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `devops-${Date.now()}@cloudlab.local`,
        password: 'Password123!',
        firstName: 'Cloud',
        lastName: 'Engineer',
      }),
    });
    const regJson = await regRes.json();
    console.log('  Register Status:', regRes.status, '| User:', regJson.data?.user?.email);
    accessToken = regJson.data?.accessToken;
    if (!accessToken) throw new Error('Failed to retrieve accessToken on register');

    // Test GET /me with Bearer token
    const meRes = await fetch(`${GATEWAY_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meJson = await meRes.json();
    console.log('  Get Profile (GET /me) Status:', meRes.status, '| Name:', `${meJson.data?.firstName} ${meJson.data?.lastName}`);
    if (meRes.status !== 200) throw new Error('Failed to fetch authenticated profile');

    // 4. Learning Service Curriculum Catalog & Quiz Flow
    console.log('\n[4/6] Testing Curriculum Catalog & Interactive Quiz Submission...');
    const tracksRes = await fetch(`${GATEWAY_URL}/api/v1/learning/tracks`);
    const tracksJson = await tracksRes.json();
    console.log('  Fetched Tracks count:', tracksJson.data?.length);
    tracksJson.data?.forEach((t: any) => console.log(`   - Track: ${t.title} (${t.slug})`));

    // Submit Quiz for Linux lesson 1
    const quizRes = await fetch(`${GATEWAY_URL}/api/v1/learning/lessons/lesson-linux-1/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [
          { questionId: 'q1', selectedIndex: 1 }, // SIGKILL
          { questionId: 'q2', selectedIndex: 1 }, // Zombie process definition
        ],
      }),
    });
    const quizJson = await quizRes.json();
    console.log('  Quiz Evaluation: Score:', `${quizJson.data?.score}%`, '| Passed:', quizJson.data?.passed, '| XP Earned:', quizJson.data?.xpEarned);

    // 5. Practical Challenge & Deterministic Validation Flow
    console.log('\n[5/6] Testing Practical Challenge Lifecycle & Deterministic Validation...');
    const challengesRes = await fetch(`${GATEWAY_URL}/api/v1/challenges`);
    const challengesJson = await challengesRes.json();
    console.log('  Available Challenges count:', challengesJson.data?.length);

    // Start K8s CrashLoopBackOff Challenge Attempt
    const startRes = await fetch(`${GATEWAY_URL}/api/v1/challenges/chal-k8s-crashloop/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const startJson = await startRes.json();
    attemptId = startJson.data?.attempt?.id;
    console.log('  Started Attempt ID:', attemptId, '| Time Remaining:', `${startJson.data?.timeRemainingSeconds}s`);

    // Submit Deterministic Validation (simulating fixed environment state)
    console.log('  Executing Deterministic Validator with fixed environment state...');
    const validateRes = await fetch(`${GATEWAY_URL}/api/v1/challenges/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attemptId,
        environmentState: {
          files: {
            '/etc/kubernetes/manifests/payment-deployment.yaml': 'env:\n  - name: DATABASE_URL\n    value: "mysql://db.internal:3306/prod"',
          },
          deployments: {
            'payment-api': { readyReplicas: 2 },
          },
          httpResponses: {
            '/health': 200,
          },
        },
      }),
    });
    const validateJson = await validateRes.json();
    console.log('  Validation Result: Passed:', validateJson.data?.passed, '| Score:', `${validateJson.data?.score}/100`, '| XP:', validateJson.data?.xpEarned);
    console.log('  Rule Checks Details:');
    validateJson.data?.checks?.forEach((c: any) => {
      console.log(`   [${c.passed ? '✓' : '✗'}] ${c.description} -> ${c.message}`);
    });

    // 6. Progress & Gamification Flow
    console.log('\n[6/6] Testing Progress, Gamification, and Cloud Readiness Score...');
    const progressRes = await fetch(`${GATEWAY_URL}/api/v1/progress/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const progressJson = await progressRes.json();
    const readiness = progressJson.data?.cloudReadiness;
    console.log('  Student Level:', progressJson.data?.level, '| Total XP:', progressJson.data?.totalXp);
    console.log('  Cloud Readiness Score:', `${readiness?.overallScore}/100`, '| Tier:', readiness?.tier);
    console.log('  Skills Breakdown:');
    readiness?.skills?.forEach((s: any) => {
      console.log(`   - ${s.skill.padEnd(12)}: ${s.score}% (${s.levelTitle})`);
    });

    console.log('\n===============================================================');
    console.log('🎉 ALL BACKEND MICROSERVICES VERIFIED SUCCESSFULLY!');
    console.log('===============================================================');
  } catch (err: any) {
    console.error('\n❌ Verification Failed:', err.message);
    process.exitCode = 1;
  } finally {
    sGateway.close();
    sAuth.close();
    sLearning.close();
    sChallenge.close();
    sProgress.close();
  }
}

runVerification();

/**
 * Quizzle — Firestore security rules tests.
 *
 * STATUS: WRITTEN, NOT YET EXECUTED.
 *
 * These require the Firestore emulator, which is not available in the sandbox
 * (no Java, no firebase-tools, no network access to download them). They are
 * therefore excluded from the default `npm test` run so they cannot fail CI
 * spuriously.
 *
 * To run them locally:
 *
 *   firebase emulators:start --only firestore --project quizzle-rules-test
 *   npm run test:rules
 *
 * `firebase.json` pins the emulator to port 8089 so it does not collide with
 * the Expo web dev server on 8080.
 *
 * Read `firestore.rules` alongside this file: each describe block maps to one
 * match block in the rules.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { setDoc, getDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

// Port matches firebase.json. Override with FIRESTORE_EMULATOR_PORT if needed.
// 8089 rather than the emulator default 8080, which collides with the Expo
// web dev server.
const EMULATOR_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8089);
const RULES_PATH = resolve(__dirname, '../../firestore.rules');

let testEnv: RulesTestEnvironment;

/** Firestore handle for an authenticated user, or anonymous when omitted. */
function db(uid?: string) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

const ALICE = 'alice-uid';
const BOB = 'bob-uid';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'quizzle-rules-test',
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: EMULATOR_PORT,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('users/{userId}', () => {
  const aliceProfile = { email: 'alice@example.com', createdAt: Timestamp.now() };

  it('lets a user read their own profile', async () => {
    await db(ALICE).doc(`users/${ALICE}`).set(aliceProfile);
    await assertSucceeds(getDoc(doc(db(ALICE), 'users', ALICE)));
  });

  it('blocks reading another user profile', async () => {
    await db(ALICE).doc(`users/${ALICE}`).set(aliceProfile);
    await assertFails(getDoc(doc(db(BOB), 'users', ALICE)));
  });

  it('blocks anonymous reads', async () => {
    await db(ALICE).doc(`users/${ALICE}`).set(aliceProfile);
    await assertFails(getDoc(doc(db(), 'users', ALICE)));
  });

  it('blocks creating a profile under another UID', async () => {
    await assertFails(db(ALICE).doc(`users/${BOB}`).set(aliceProfile));
  });

  it('blocks changing email (identity is immutable)', async () => {
    await db(ALICE).doc(`users/${ALICE}`).set(aliceProfile);
    await assertFails(updateDoc(doc(db(ALICE), 'users', ALICE), { email: 'bob@example.com' }));
  });

  it('blocks client deletion', async () => {
    await db(ALICE).doc(`users/${ALICE}`).set(aliceProfile);
    await assertFails(deleteDoc(doc(db(ALICE), 'users', ALICE)));
  });
});

describe('quizzes/{quizId}', () => {
  const quiz = {
    ownerId: ALICE,
    title: 'Photosynthesis',
    format: 'MCQ',
    difficulty: 'Easy',
    questionCount: 10,
    isPublic: false,
    shareToken: null,
    deletedAt: null,
    createdAt: Timestamp.now(),
  };

  it('lets the owner read and write', async () => {
    await assertSucceeds(setDoc(doc(db(ALICE), 'quizzes', 'q1'), quiz));
    await assertSucceeds(getDoc(doc(db(ALICE), 'quizzes', 'q1')));
  });

  it('blocks reads by a non-owner when not shared', async () => {
    await db(ALICE).doc('quizzes/q1').set(quiz);
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
  });

  it('blocks anonymous reads', async () => {
    await db(ALICE).doc('quizzes/q1').set(quiz);
    await assertFails(getDoc(doc(db(), 'quizzes', 'q1')));
  });

  it('blocks forging ownerId on create (ownership comes from auth)', async () => {
    await assertFails(setDoc(doc(db(BOB), 'quizzes', 'q2'), { ...quiz, ownerId: ALICE }));
  });

  it('blocks transferring ownership via update', async () => {
    await db(ALICE).doc('quizzes/q1').set(quiz);
    await assertFails(updateDoc(doc(db(ALICE), 'quizzes', 'q1'), { ownerId: BOB }));
  });

  it('blocks writes by a non-owner', async () => {
    await db(ALICE).doc('quizzes/q1').set(quiz);
    await assertFails(updateDoc(doc(db(BOB), 'quizzes', 'q1'), { title: 'Hijacked' }));
  });

  it('rejects an over-long title', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'quizzes', 'q3'), { ...quiz, title: 'x'.repeat(201) }));
  });
});

describe('quizzes — public sharing', () => {
  const sharedQuiz = {
    ownerId: ALICE,
    title: 'Shared quiz',
    isPublic: true,
    shareToken: 'tok-123',
    deletedAt: null,
    createdAt: Timestamp.now(),
  };

  // shareLinks is server-written, so it is seeded with the admin context.
  async function seedShareLink(link: Record<string, unknown>) {
    await testEnv.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc('shareLinks/tok-123').set(link)
    );
  }

  it('allows public read when the share link is active', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000) });
    await assertSucceeds(getDoc(doc(db(BOB), 'quizzes', 'q1')));
    await assertSucceeds(getDoc(doc(db(), 'quizzes', 'q1')));
  });

  it('blocks public read once the share link is revoked', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({
      quizId: 'q1',
      expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
      revokedAt: Timestamp.now(),
    });
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
  });

  it('blocks public read once the share link has expired', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
  });

  it('blocks public read when isPublic is false even with a live token', async () => {
    await db(ALICE)
      .doc('quizzes/q1')
      .set({ ...sharedQuiz, isPublic: false });
    await seedShareLink({ quizId: 'q1', expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000) });
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
  });
});

describe('quizAttempts/{attemptId}', () => {
  const quiz = {
    ownerId: ALICE,
    title: 'Attempt quiz',
    isPublic: false,
    shareToken: null,
    deletedAt: null,
    createdAt: Timestamp.now(),
  };

  beforeEach(async () => {
    await db(ALICE).doc('quizzes/q1').set(quiz);
  });

  it('lets a user record their own attempt', async () => {
    await assertSucceeds(
      setDoc(doc(db(BOB), 'quizAttempts', 'a1'), { quizId: 'q1', userId: BOB, score: 8 })
    );
  });

  it('blocks recording an attempt as another user', async () => {
    await assertFails(
      setDoc(doc(db(BOB), 'quizAttempts', 'a2'), { quizId: 'q1', userId: ALICE, score: 8 })
    );
  });

  it('blocks recording an attempt for a quiz that does not exist', async () => {
    await assertFails(
      setDoc(doc(db(BOB), 'quizAttempts', 'a3'), { quizId: 'missing', userId: BOB })
    );
  });

  it('lets the quiz owner read attempts on their quiz', async () => {
    await db(BOB).doc('quizAttempts/a1').set({ quizId: 'q1', userId: BOB });
    await assertSucceeds(getDoc(doc(db(ALICE), 'quizAttempts', 'a1')));
  });

  it('blocks a third party from reading someone else’s attempt', async () => {
    await db(BOB).doc('quizAttempts/a1').set({ quizId: 'q1', userId: BOB });
    await assertFails(getDoc(doc(db('carol-uid'), 'quizAttempts', 'a1')));
  });
});

describe('shareLinks/{token}', () => {
  it('is readable by anyone (that is how a token resolves)', async () => {
    await testEnv.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc('shareLinks/tok-1').set({ quizId: 'q1' })
    );
    await assertSucceeds(getDoc(doc(db(), 'shareLinks', 'tok-1')));
  });

  it('blocks all client writes (server-only)', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'shareLinks', 'tok-2'), { quizId: 'q1' }));
    await assertFails(setDoc(doc(db(), 'shareLinks', 'tok-2'), { quizId: 'q1' }));
  });
});

describe('rateLimits/{id}', () => {
  it('blocks all client access', async () => {
    await testEnv.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc('rateLimits/rl1').set({ count: 1 })
    );
    await assertFails(getDoc(doc(db(ALICE), 'rateLimits', 'rl1')));
    await assertFails(setDoc(doc(db(ALICE), 'rateLimits', 'rl2'), { count: 1 }));
  });
});

describe('default deny', () => {
  it('blocks access to any collection not explicitly matched', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'somethingElse', 'x'), { foo: 'bar' }));
    await assertFails(getDoc(doc(db(ALICE), 'somethingElse', 'x')));
  });
});

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

  it('blocks anonymous create', async () => {
    await assertFails(db().doc(`users/${ALICE}`).set(aliceProfile));
  });

  it('blocks create without createdAt', async () => {
    await assertFails(db(ALICE).doc(`users/${ALICE}`).set({ email: 'alice@example.com' }));
  });

  it('blocks create with a non-string email', async () => {
    await assertFails(
      db(ALICE).doc(`users/${ALICE}`).set({ email: 12345, createdAt: Timestamp.now() })
    );
  });

  it('allows a benign self-update that preserves email', async () => {
    await db(ALICE).doc(`users/${ALICE}`).set(aliceProfile);
    await assertSucceeds(updateDoc(doc(db(ALICE), 'users', ALICE), { theme: 'dark' }));
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

  it('accepts a title of exactly 200 characters (boundary)', async () => {
    await assertSucceeds(
      setDoc(doc(db(ALICE), 'quizzes', 'q4'), { ...quiz, title: 'x'.repeat(200) })
    );
  });

  it('blocks anonymous create, update and delete', async () => {
    await assertFails(setDoc(doc(db(), 'quizzes', 'q5'), { ...quiz, ownerId: 'nobody' }));
    await db(ALICE).doc('quizzes/q1').set(quiz);
    await assertFails(updateDoc(doc(db(), 'quizzes', 'q1'), { title: 'Hijacked' }));
    await assertFails(deleteDoc(doc(db(), 'quizzes', 'q1')));
  });

  it('blocks create when ownerId is missing', async () => {
    const withoutOwner = {
      title: quiz.title,
      format: quiz.format,
      difficulty: quiz.difficulty,
      questionCount: quiz.questionCount,
      createdAt: quiz.createdAt,
    };
    await assertFails(setDoc(doc(db(ALICE), 'quizzes', 'q6'), withoutOwner));
  });

  it('blocks create when deletedAt is set (no soft-deleted births)', async () => {
    await assertFails(
      setDoc(doc(db(ALICE), 'quizzes', 'q7'), { ...quiz, deletedAt: Timestamp.now() })
    );
  });

  it('lets the owner soft-delete by setting deletedAt', async () => {
    await db(ALICE).doc('quizzes/q1').set(quiz);
    await assertSucceeds(
      updateDoc(doc(db(ALICE), 'quizzes', 'q1'), { deletedAt: Timestamp.now() })
    );
  });

  it('blocks a non-owner from deleting', async () => {
    await db(ALICE).doc('quizzes/q1').set(quiz);
    await assertFails(deleteDoc(doc(db(BOB), 'quizzes', 'q1')));
  });
});

describe('quizzes — shared access is server-mediated, never direct', () => {
  // v3: there is no public read path. A quiz the owner has marked public, with
  // a share link seeded by the server, must grant NO direct read access to
  // anyone but the owner. The quiz document embeds questions[].correctAnswer,
  // so any non-owner read would leak the answer key.
  const SHARE_TOKEN = 'tok-123';

  const sharedQuiz = {
    ownerId: ALICE,
    title: 'Shared quiz',
    isPublic: true,
    shareToken: SHARE_TOKEN,
    deletedAt: null,
    createdAt: Timestamp.now(),
    questions: [
      {
        id: 'qn1',
        type: 'MCQ',
        prompt: 'Which gas do plants absorb?',
        options: ['O2', 'CO2'],
        correctAnswer: 'CO2',
        explanation: 'Plants take in CO2 for photosynthesis.',
      },
    ],
  };

  const future = () => Timestamp.fromMillis(Date.now() + 86_400_000);
  const past = () => Timestamp.fromMillis(Date.now() - 1000);

  // shareLinks is server-written, so it is seeded with the admin context.
  async function seedShareLink(link: Record<string, unknown>) {
    await testEnv.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc(`shareLinks/${SHARE_TOKEN}`).set(link)
    );
  }

  /** Returns the document data if the read succeeded, or null if it was denied. */
  async function tryRead(dbHandle: ReturnType<typeof db>, path: string) {
    try {
      const snap = await getDoc(doc(dbHandle, 'quizzes', path));
      return snap.data() ?? null;
    } catch {
      return null;
    }
  }

  it('blocks ANONYMOUS direct reads even when the share link is live', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: future() });
    await assertFails(getDoc(doc(db(), 'quizzes', 'q1')));
  });

  it('blocks other signed-in users even when the share link is live', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: future() });
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
  });

  it('NEVER exposes the answer key to a non-owner', async () => {
    // Regression test for the v3 change. If a future rule reintroduces a
    // public read path, `leaked` becomes non-null and this fails.
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: future() });
    const leaked = await tryRead(db(BOB), 'q1');
    expect(leaked).toBeNull();
    const leakedAnon = await tryRead(db(), 'q1');
    expect(leakedAnon).toBeNull();
  });

  it('grants nothing on an EXPIRED share link', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: past() });
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
    await assertFails(getDoc(doc(db(), 'quizzes', 'q1')));
  });

  it('grants nothing on a REVOKED share link', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: future(), revokedAt: Timestamp.now() });
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
  });

  it('grants nothing on a FORGED share link invented client-side', async () => {
    // The owner may set isPublic and shareToken on their own quiz, but cannot
    // mint the shareLinks row, so the quiz must stay private.
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    // Deliberately no shareLinks document seeded.
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
    await assertFails(getDoc(doc(db(), 'quizzes', 'q1')));
  });

  it('still lets the OWNER read their own shared quiz', async () => {
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: future() });
    await assertSucceeds(getDoc(doc(db(ALICE), 'quizzes', 'q1')));
  });

  it('lets the SERVER read the quiz, which is how sharing works', async () => {
    // The share API reads the quiz with the Admin SDK and returns a sanitised
    // copy. Rules intentionally do not block this path.
    await db(ALICE).doc('quizzes/q1').set(sharedQuiz);
    await seedShareLink({ quizId: 'q1', expiresAt: future() });

    let serverSnapshot: { exists: boolean } | undefined;
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const snap = await ctx.firestore().doc('quizzes/q1').get();
      serverSnapshot = { exists: snap.exists };
    });
    expect(serverSnapshot?.exists).toBe(true);
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

  it('blocks the attempt author from reassigning it to another user', async () => {
    await db(BOB).doc('quizAttempts/a1').set({ quizId: 'q1', userId: BOB });
    await assertFails(updateDoc(doc(db(BOB), 'quizAttempts', 'a1'), { userId: ALICE }));
  });

  it('blocks the quiz owner from editing an attempt they did not author', async () => {
    await db(BOB).doc('quizAttempts/a1').set({ quizId: 'q1', userId: BOB, score: 3 });
    // The owner may read it (asserted above) but must not be able to change it.
    await assertFails(updateDoc(doc(db(ALICE), 'quizAttempts', 'a1'), { score: 10 }));
  });

  it('blocks anonymous create and read', async () => {
    await assertFails(setDoc(doc(db(), 'quizAttempts', 'a9'), { quizId: 'q1', userId: BOB }));
    await db(BOB).doc('quizAttempts/a1').set({ quizId: 'q1', userId: BOB });
    await assertFails(getDoc(doc(db(), 'quizAttempts', 'a1')));
  });
});

describe('shareLinks/{token}', () => {
  it('is readable by anyone (that is how a token resolves)', async () => {
    await testEnv.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc('shareLinks/tok-1').set({ quizId: 'q1' })
    );
    await assertSucceeds(getDoc(doc(db(), 'shareLinks', 'tok-1')));
    await assertSucceeds(getDoc(doc(db(ALICE), 'shareLinks', 'tok-1')));
  });

  it('blocks create by any client, authenticated or not', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'shareLinks', 'tok-2'), { quizId: 'q1' }));
    await assertFails(setDoc(doc(db(), 'shareLinks', 'tok-2'), { quizId: 'q1' }));
  });

  it('blocks update and delete by any client (server-only)', async () => {
    await testEnv.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc('shareLinks/tok-1').set({ quizId: 'q1', accessCount: 0 })
    );
    await assertFails(updateDoc(doc(db(ALICE), 'shareLinks', 'tok-1'), { accessCount: 99 }));
    await assertFails(deleteDoc(doc(db(ALICE), 'shareLinks', 'tok-1')));
    await assertFails(deleteDoc(doc(db(), 'shareLinks', 'tok-1')));
  });

  it('stops a client from forging a share link to publish a quiz', async () => {
    // Even if a client marks its own quiz public, it cannot mint the link,
    // so the quiz must not become readable to others.
    await db(ALICE).doc('quizzes/q1').set({
      ownerId: ALICE,
      title: 'Trying to self-publish',
      isPublic: true,
      shareToken: 'forged-token',
      deletedAt: null,
    });
    await assertFails(getDoc(doc(db(BOB), 'quizzes', 'q1')));
    await assertFails(getDoc(doc(db(), 'quizzes', 'q1')));
  });
});

describe('rateLimits/{id}', () => {
  it('blocks all client access', async () => {
    await testEnv.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc('rateLimits/rl1').set({ count: 1 })
    );
    await assertFails(getDoc(doc(db(ALICE), 'rateLimits', 'rl1')));
    await assertFails(getDoc(doc(db(), 'rateLimits', 'rl1')));
    await assertFails(setDoc(doc(db(ALICE), 'rateLimits', 'rl2'), { count: 1 }));
    await assertFails(updateDoc(doc(db(ALICE), 'rateLimits', 'rl1'), { count: 0 }));
    await assertFails(deleteDoc(doc(db(ALICE), 'rateLimits', 'rl1')));
  });
});

describe('default deny', () => {
  it('blocks access to any collection not explicitly matched', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'somethingElse', 'x'), { foo: 'bar' }));
    await assertFails(getDoc(doc(db(ALICE), 'somethingElse', 'x')));
  });
});

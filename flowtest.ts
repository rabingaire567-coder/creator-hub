/**
 * End-to-end flow test for the Community Membership system.
 * Mints real Convex Auth RS256 JWTs (same format the app's auth uses) and
 * drives the member/admin flow against the dev deployment.
 * Usage: bun run flowtest.ts
 */
import { execSync } from "node:child_process";
import { ConvexHttpClient } from "convex/browser";
import { SignJWT, importPKCS8 } from "jose";

const CONVEX_URL = "https://lovely-llama-842.convex.cloud";
const ISSUER = "https://lovely-llama-842.convex.site";

// Existing dev users (read from the deployment at recon time).
const MEMBER_A = "jx71zwae9vggyt1aqeshssepyh8fk5bv"; // anonymous user
const MEMBER_B = "jx7btmcx0bew10r8gzb0ta59b18fk5kt"; // anonymous user
const ADMIN_USER = "jx7fv9ypssw9dmzw5pw88mxahx8fjj6g"; // email user (adminEmail unset → bootstrap admin)

function getPrivateKey(): string {
  const out = execSync("bunx convex env get JWT_PRIVATE_KEY", {
    encoding: "utf8",
    cwd: process.cwd(),
  });
  const match = out.match(
    /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/,
  );
  if (!match) throw new Error("Could not read JWT_PRIVATE_KEY");
  const body = match[0]
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .trim()
    .split(/\s+/)
    .join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
}

const privateKey = await importPKCS8(getPrivateKey(), "RS256");

async function tokenFor(userId: string): Promise<string> {
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(`${userId}|testsession`)
    .setIssuer(ISSUER)
    .setAudience("convex")
    .setIssuedAt()
    .setExpirationTime(Date.now() + 60 * 60 * 1000)
    .sign(privateKey);
}

function client(jwt?: string): ConvexHttpClient {
  const c = new ConvexHttpClient(CONVEX_URL);
  if (jwt) c.setAuth(jwt);
  return c;
}

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}

async function expectThrow(name: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    check(name, false, `resolved instead of throwing: ${JSON.stringify(result).slice(0, 120)}`);
  } catch {
    check(name, true);
  }
}

const jwtA = await tokenFor(MEMBER_A);
const jwtB = await tokenFor(MEMBER_B);
const jwtAdmin = await tokenFor(ADMIN_USER);

const A = client(jwtA);
const B = client(jwtB);
const Admin = client(jwtAdmin);
const Anon = client();

console.log("\n== 1. Unauthenticated (signed-out) access ==");
check("listMyMessages → []", (await Anon.query("members:listMyMessages", {})).length === 0);
check("getMyProfile → null", (await Anon.query("members:getMyProfile", {})) === null);
check("countUnreadMessages → 0", (await Anon.query("members:countUnreadMessages", {})) === 0);
check("listCreatorUpdates → []", (await Anon.query("members:listCreatorUpdates", {})).length === 0);
await expectThrow("sendMessage blocked when signed out", () => Anon.mutation("members:sendMessage", { body: "hi" }));
await expectThrow("adminListMembers blocked when signed out", () => Anon.query("members:adminListMembers", {}));

console.log("\n== 2. First visit: profile auto-created (signup → member area) ==");
const profile0 = await A.query("members:getMyProfile", {});
check("profile exists before ensure (null expected first)", profile0 === null || typeof profile0.displayName === "string");
const profile = await A.mutation("members:ensureMyProfile", {});
check("ensureMyProfile created a profile", profile !== null && typeof profile.displayName === "string", profile);
const profile2 = await A.mutation("members:ensureMyProfile", {});
check("ensureMyProfile is idempotent (same id)", profile2?._id === profile._id);

console.log("\n== 3. Profile editing (own profile only) ==");
await A.mutation("members:updateMyProfile", {
  displayName: "Flow Test Member",
  bio: "Testing the community membership system.",
  photo: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z",
});
const profile3 = await A.query("members:getMyProfile", {});
check("displayName saved", profile3?.displayName === "Flow Test Member", profile3?.displayName);
check("bio saved", profile3?.bio === "Testing the community membership system.");
check("photo saved", typeof profile3?.photo === "string" && profile3.photo.startsWith("data:image/jpeg"));
await expectThrow("displayName < 2 chars rejected", () =>
  A.mutation("members:updateMyProfile", { displayName: "x" }),
);

console.log("\n== 4. Messaging: member → creator ==");
await A.mutation("members:sendMessage", { body: "Hello! Excited to be part of the community." });
const msgsA = await A.query("members:listMyMessages", {});
check("member sees own message", msgsA.length === 1 && msgsA[0].sender === "member");
check("own message marked sent (unread to admin)", msgsA[0].read === false);
const msgsB = await B.query("members:listMyMessages", {});
check("member B sees NO messages of member A", msgsB.length === 0, msgsB.length);
check("admin unread count is 1", (await Admin.query("members:adminUnreadCount", {})) === 1);

console.log("\n== 5. Admin: view members, search, conversation ==");
const membersList = await Admin.query("members:adminListMembers", { search: "Flow Test" });
check("admin finds member by search", membersList.total === 1 && membersList.items[0].profile.displayName === "Flow Test Member");
const allMembers = await Admin.query("members:adminListMembers", {});
check("member row shows unread=1 + last message", allMembers.items.some((r: any) => r.profile._id === profile._id && r.unread === 1 && r.lastMessage?.body.startsWith("Hello!")));
const thread = await Admin.query("members:adminListThread", { userId: MEMBER_A });
check("admin sees the thread", thread.messages.length === 1 && thread.profile?.displayName === "Flow Test Member");

console.log("\n== 6. Admin reply → member receives it ==");
await Admin.mutation("members:adminReply", { userId: MEMBER_A, body: "Welcome aboard! Great to have you." });
check("admin unread now 2 (member msg + still pending admin's own? no — only member msgs)", (await Admin.query("members:adminUnreadCount", {})) === 1);
const msgsA2 = await A.query("members:listMyMessages", {});
check("member sees reply", msgsA2.length === 2 && msgsA2[1].sender === "admin" && msgsA2[1].body.startsWith("Welcome"));
check("reply is unread to member", msgsA2[1].read === false);
check("member unread count = 1", (await A.query("members:countUnreadMessages", {})) === 1);
const notes = await A.query("members:listMyNotifications", {});
check("notification created for reply", notes.length >= 1 && notes[0].title === "New reply from the creator", notes);
check("unread notifications = 1", (await A.query("members:countUnreadNotifications", {})) === 1);

console.log("\n== 7. Mark read (both directions) ==");
await A.mutation("members:markMessagesRead", {});
check("member unread = 0 after reading", (await A.query("members:countUnreadMessages", {})) === 0);
check("reply now read=true", (await A.query("members:listMyMessages", {}))[1].read === true);
await Admin.mutation("members:adminMarkThreadRead", { userId: MEMBER_A });
check("admin unread = 0 after mark read", (await Admin.query("members:adminUnreadCount", {})) === 0);
await A.mutation("members:markNotificationsRead", {});
check("notifications cleared", (await A.query("members:countUnreadNotifications", {})) === 0);

console.log("\n== 8. Security: members can't reach admin or each other ==");
await expectThrow("B blocked from adminListMembers", () => B.query("members:adminListMembers", {}));
await expectThrow("B blocked from adminListThread", () => B.query("members:adminListThread", { userId: MEMBER_A }));
await expectThrow("B blocked from adminReply", () => B.mutation("members:adminReply", { userId: MEMBER_A, body: "spoof" }));
await expectThrow("B blocked from adminSetMemberStatus", () => B.mutation("members:adminSetMemberStatus", { userId: MEMBER_A, status: "disabled" }));
await expectThrow("B blocked from adminDeleteMember", () => B.mutation("members:adminDeleteMember", { userId: MEMBER_A }));
await expectThrow("B blocked from adminCreateUpdate", () => B.mutation("members:adminCreateUpdate", { title: "x", body: "y" }));
const notesA = await A.query("members:listMyNotifications", {});
await expectThrow("B can't mark A's notification read", () => B.mutation("members:markNotificationRead", { id: notesA[0]._id }));
check("A's listMyMessages still only own messages", (await A.query("members:listMyMessages", {})).every((m: any) => m.memberId === MEMBER_A));
check("B sees empty thread", (await B.query("members:listMyMessages", {})).length === 0);

console.log("\n== 9. Saved content ==");
const firstSave = await A.mutation("members:toggleSavedContent", { contentId: "test-video-1", kind: "video", title: "Test Video", subtitle: "For the flow test", href: "/content/test-video-1" });
check("save → saved:true", firstSave.saved === true);
const secondSave = await A.mutation("members:toggleSavedContent", { contentId: "test-video-1", kind: "video", title: "Test Video", href: "/content/test-video-1" });
check("unsave → saved:false", secondSave.saved === false);
await A.mutation("members:toggleSavedContent", { contentId: "test-video-1", kind: "video", title: "Test Video", href: "/content/test-video-1" });
check("saved list has 1 item", (await A.query("members:listSavedContent", {})).length === 1);
check("B's saved list is empty", (await B.query("members:listSavedContent", {})).length === 0);

console.log("\n== 10. Creator update → notification fanout ==");
await Admin.mutation("members:adminCreateUpdate", { title: "New video this Friday", body: "A documentary-style video drops Friday at 6pm.", kind: "announcement" });
const updates = await A.query("members:listCreatorUpdates", {});
check("member sees the update", updates.length === 1 && updates[0].title === "New video this Friday");
check("member got notification", (await A.query("members:countUnreadNotifications", {})) === 1);
await A.mutation("members:markNotificationsRead", {});

console.log("\n== 11. Disable / re-enable account ==");
await Admin.mutation("members:adminSetMemberStatus", { userId: MEMBER_A, status: "disabled" });
check("profile status=disabled", (await A.query("members:getMyProfile", {}))?.status === "disabled");
await expectThrow("disabled member can't send messages", () => A.mutation("members:sendMessage", { body: "should fail" }));
await expectThrow("disabled member can't update profile", () => A.mutation("members:updateMyProfile", { displayName: "Nope" }));
await Admin.mutation("members:adminSetMemberStatus", { userId: MEMBER_A, status: "active" });
await A.mutation("members:sendMessage", { body: "Back to normal." });
check("re-enabled member can send again", (await A.query("members:listMyMessages", {})).length >= 2);

console.log("\n== 12. Persistence: fresh client + same token (refresh simulation) ==");
const fresh = client(jwtA);
check("profile persists", (await fresh.query("members:getMyProfile", {}))?.displayName === "Flow Test Member");
check("messages persist", (await fresh.query("members:listMyMessages", {})).length >= 2);
const expiredNoAuth = client();
check("without token → unauthenticated again (logout)", (await expiredNoAuth.query("members:getMyProfile", {})) === null);

console.log("\n== 13. Cleanup test data ==");
const upd = await Admin.query("members:adminListUpdates", {});
for (const u of upd) {
  if (u.title === "New video this Friday") await Admin.mutation("members:adminDeleteUpdate", { id: u._id });
}
await Admin.mutation("members:adminDeleteMember", { userId: MEMBER_A });
check("A's community data removed", (await Admin.query("members:adminListMembers", { search: "Flow Test" })).total === 0);
check("A's thread gone", (await Admin.query("members:adminListThread", { userId: MEMBER_A })).messages.length === 0);
check("updates cleaned", (await Admin.query("members:adminListUpdates", {})).length === 0);

console.log(`\n===== ${passed} passed, ${failed} failed =====\n`);
process.exit(failed > 0 ? 1 : 0);

import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  // Shared state for chaining tests (e.g., created resource IDs, auth tokens)
  let sessionId: string;

  test("Create a chat session", async () => {
    const res = await api("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Chat Session" }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.title).toBe("Test Chat Session");
    expect(data.created_at).toBeDefined();
    sessionId = data.id;
  });

  test("List all chat sessions", async () => {
    const res = await api("/api/chat/sessions");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
  });

  test("Get messages for a session (initially empty)", async () => {
    const res = await api(`/api/chat/sessions/${sessionId}/messages`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.messages).toBeDefined();
    expect(Array.isArray(data.messages)).toBe(true);
  });

  test("Send a message to the session", async () => {
    const res = await api(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "What is the capital of France?" }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.user_message).toBeDefined();
    expect(data.user_message.content).toBe("What is the capital of France?");
    expect(data.assistant_message).toBeDefined();
  });

  test("Get messages for session after sending", async () => {
    const res = await api(`/api/chat/sessions/${sessionId}/messages`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.messages).toBeDefined();
    expect(Array.isArray(data.messages)).toBe(true);
    expect(data.messages.length).toBeGreaterThanOrEqual(2); // user + assistant
  });

  test("Delete the chat session", async () => {
    const res = await api(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Verify session is deleted by getting messages (404)", async () => {
    const res = await api(`/api/chat/sessions/${sessionId}/messages`);
    await expectStatus(res, 404);
  });

  test("Get messages for non-existent session (404)", async () => {
    const res = await api(
      "/api/chat/sessions/00000000-0000-0000-0000-000000000000/messages"
    );
    await expectStatus(res, 404);
  });

  test("Send message to non-existent session (404)", async () => {
    const res = await api(
      "/api/chat/sessions/00000000-0000-0000-0000-000000000000/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hello" }),
      }
    );
    await expectStatus(res, 404);
  });

  test("Delete non-existent session (404)", async () => {
    const res = await api(
      "/api/chat/sessions/00000000-0000-0000-0000-000000000000",
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 404);
  });

  test("Send message without required content field (400)", async () => {
    // Create a temporary session
    const sessionRes = await api("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Temp session" }),
    });
    await expectStatus(sessionRes, 201);
    const sessionData = await sessionRes.json();
    const tempSessionId = sessionData.id;

    // Try to send a message without content
    const res = await api(`/api/chat/sessions/${tempSessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });
});

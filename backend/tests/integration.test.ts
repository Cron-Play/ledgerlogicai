import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  // Shared state for chaining tests (e.g., created resource IDs, auth tokens)
  let sessionId: string;

  test("Create a chat session with title", async () => {
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
    expect(data.updated_at).toBeDefined();
    sessionId = data.id;
  });

  test("Create a chat session without title", async () => {
    const res = await api("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.created_at).toBeDefined();
    expect(data.updated_at).toBeDefined();
  });

  test("List all chat sessions", async () => {
    const res = await api("/api/chat/sessions");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
    // Verify structure of first session if available
    if (data.sessions.length > 0) {
      const session = data.sessions[0];
      expect(session.id).toBeDefined();
      expect(session.created_at).toBeDefined();
      expect(session.updated_at).toBeDefined();
      expect(session.last_message === null || typeof session.last_message === "string").toBe(true);
    }
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
    expect(data.user_message.role).toBeDefined();
    expect(data.user_message.session_id).toBe(sessionId);
    expect(data.user_message.created_at).toBeDefined();
    expect(data.assistant_message).toBeDefined();
    expect(data.assistant_message.role).toBeDefined();
    expect(data.assistant_message.session_id).toBe(sessionId);
    expect(data.assistant_message.created_at).toBeDefined();
  });

  test("Get messages for session after sending", async () => {
    const res = await api(`/api/chat/sessions/${sessionId}/messages`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.messages).toBeDefined();
    expect(Array.isArray(data.messages)).toBe(true);
    expect(data.messages.length).toBeGreaterThanOrEqual(2); // user + assistant
    // Verify message structure
    data.messages.forEach((msg: any) => {
      expect(msg.id).toBeDefined();
      expect(msg.session_id).toBe(sessionId);
      expect(msg.role).toBeDefined();
      expect(msg.content).toBeDefined();
      expect(msg.created_at).toBeDefined();
    });
  });

  test("Send multiple messages to build conversation", async () => {
    const res = await api(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "What is 2+2?" }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.user_message).toBeDefined();
    expect(data.assistant_message).toBeDefined();
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

  test("Send message with empty content string (400)", async () => {
    // Create a temporary session
    const sessionRes = await api("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Empty content test" }),
    });
    await expectStatus(sessionRes, 201);
    const sessionData = await sessionRes.json();
    const tempSessionId = sessionData.id;

    // Send a message with empty content
    const res = await api(`/api/chat/sessions/${tempSessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });
    await expectStatus(res, 400);
  });
});

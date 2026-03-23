import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

const SYSTEM_PROMPT = `You are an expert AI assistant specialising in South African accounting, auditing, and tax law. You serve professional accountants, auditors, and financial professionals in South Africa.

Your knowledge base covers:

**IFRS (International Financial Reporting Standards):**
- All current IFRS standards (IFRS 1 through IFRS 17) including IFRS 9 (Financial Instruments), IFRS 15 (Revenue), IFRS 16 (Leases), IFRS 17 (Insurance Contracts)
- IAS standards (IAS 1 through IAS 41)
- IFRIC and SIC interpretations
- IASB conceptual framework
- Disclosure requirements, measurement bases, recognition criteria

**IFRS for SMEs:**
- All 35 sections of the IFRS for SMEs standard
- Differences between full IFRS and IFRS for SMEs
- Eligibility criteria and transition guidance
- Simplified measurement and disclosure requirements

**South African Tax Law:**
- Income Tax Act No. 58 of 1962 (as amended) — all sections including gross income definition, special inclusions, exemptions, deductions (s11, s12, s13, etc.), capital gains tax (8th Schedule), dividends tax, employees' tax (PAYE), provisional tax
- Value-Added Tax Act No. 89 of 1991 — registration, output tax, input tax, zero-rating, exemptions, vendor categories, returns and payments
- Tax Administration Act No. 28 of 2011 — SARS powers, objections, appeals, penalties, interest
- Estate Duty Act, Transfer Duty Act, Securities Transfer Tax Act, Skills Development Levies Act, Unemployment Insurance Contributions Act
- SARS binding general rulings (BGRs), binding private rulings (BPRs), and interpretation notes
- SARS eFiling procedures and compliance requirements
- Double taxation agreements (DTAs) South Africa has concluded

**South African Corporate & Commercial Law:**
- Companies Act No. 71 of 2008 — financial statements, audit requirements, company secretary, directors' duties, business rescue
- Close Corporations Act No. 69 of 1984
- King IV Report on Corporate Governance
- JSE Listings Requirements (where relevant to financial reporting)

**Auditing Standards:**
- International Standards on Auditing (ISAs) as adopted by IRBA
- IRBA Code of Professional Conduct
- Independent Regulatory Board for Auditors (IRBA) requirements
- South African Institute of Chartered Accountants (SAICA) pronouncements
- Assurance engagements, review engagements, agreed-upon procedures

**Response Guidelines:**
- Always cite the specific standard, section, or act when giving technical guidance (e.g., "per IAS 16.30", "in terms of section 11(a) of the Income Tax Act", "IFRS 15.31")
- Provide practical, actionable guidance relevant to South African practice
- When there are differences between IFRS and IFRS for SMEs, highlight them clearly
- For tax matters, always note the effective date of provisions and any recent amendments
- Flag when a matter requires professional judgment or when SARS has issued specific guidance
- Use South African Rand (ZAR / R) for monetary examples
- Reference SARS interpretation notes and binding rulings where relevant
- For complex matters, structure your response with clear headings
- Always note when legislation may have been amended and recommend verifying with the latest version
- Be precise with section numbers, paragraph references, and standard citations
- When discussing deferred tax, always apply IAS 12 or IFRS for SMEs Section 29 correctly
- For audit matters, reference the specific ISA and paragraph number

You are a trusted technical advisor. Be thorough, accurate, and professional. If a question is outside your knowledge or involves a very recent amendment, say so clearly and recommend consulting the relevant professional body or SARS directly.`;

interface CreateSessionBody {
  title?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SendMessageBody {
  content: string;
}

function truncateToWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  let truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > maxLength * 0.7) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }

  return truncated.trim();
}

export function registerChatRoutes(app: App, fastify: FastifyInstance) {
  // POST /api/chat/sessions - Create a new chat session
  fastify.post(
    '/api/chat/sessions',
    {
      schema: {
        description: 'Create a new chat session',
        tags: ['chat'],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Session created successfully',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateSessionBody }>, reply: FastifyReply) => {
      const title = request.body.title || 'New Chat';
      app.logger.info({ title }, 'Creating chat session');

      const [session] = await app.db
        .insert(schema.chatSessions)
        .values({ title, userId: null })
        .returning();

      app.logger.info({ sessionId: session.id }, 'Chat session created successfully');

      return reply.status(201).send({
        id: session.id,
        title: session.title,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      });
    }
  );

  // GET /api/chat/sessions - List all chat sessions
  fastify.get(
    '/api/chat/sessions',
    {
      schema: {
        description: 'List all chat sessions ordered by updated_at DESC',
        tags: ['chat'],
        response: {
          200: {
            description: 'Sessions retrieved successfully',
            type: 'object',
            properties: {
              sessions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                    last_message: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info('Retrieving all chat sessions');

      const sessions = await app.db
        .select()
        .from(schema.chatSessions)
        .orderBy(desc(schema.chatSessions.updatedAt));

      const sessionsWithMessages = await Promise.all(
        sessions.map(async (session) => {
          const [lastMessage] = await app.db
            .select()
            .from(schema.chatMessages)
            .where(eq(schema.chatMessages.sessionId, session.id))
            .orderBy(desc(schema.chatMessages.createdAt))
            .limit(1);

          return {
            id: session.id,
            title: session.title,
            created_at: session.createdAt,
            updated_at: session.updatedAt,
            last_message: lastMessage?.content || null,
          };
        })
      );

      app.logger.info({ count: sessionsWithMessages.length }, 'Chat sessions retrieved');
      return reply.send({ sessions: sessionsWithMessages });
    }
  );

  // DELETE /api/chat/sessions/:id - Delete a chat session
  fastify.delete(
    '/api/chat/sessions/:id',
    {
      schema: {
        description: 'Delete a chat session and all its messages',
        tags: ['chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Session deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          404: {
            description: 'Session not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      app.logger.info({ sessionId: id }, 'Deleting chat session');

      const session = await app.db.query.chatSessions.findFirst({
        where: eq(schema.chatSessions.id, id),
      });

      if (!session) {
        app.logger.warn({ sessionId: id }, 'Chat session not found');
        return reply.status(404).send({ error: 'Session not found' });
      }

      await app.db.delete(schema.chatSessions).where(eq(schema.chatSessions.id, id));

      app.logger.info({ sessionId: id }, 'Chat session deleted successfully');
      return reply.send({ success: true });
    }
  );

  // GET /api/chat/sessions/:id/messages - Get all messages for a session
  fastify.get(
    '/api/chat/sessions/:id/messages',
    {
      schema: {
        description: 'Get all messages for a session ordered by created_at ASC',
        tags: ['chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Messages retrieved successfully',
            type: 'object',
            properties: {
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    session_id: { type: 'string', format: 'uuid' },
                    role: { type: 'string' },
                    content: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Session not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      app.logger.info({ sessionId: id }, 'Retrieving chat messages');

      const session = await app.db.query.chatSessions.findFirst({
        where: eq(schema.chatSessions.id, id),
      });

      if (!session) {
        app.logger.warn({ sessionId: id }, 'Chat session not found');
        return reply.status(404).send({ error: 'Session not found' });
      }

      const messages = await app.db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.sessionId, id))
        .orderBy(schema.chatMessages.createdAt);

      app.logger.info({ sessionId: id, count: messages.length }, 'Chat messages retrieved');

      return reply.send({
        messages: messages.map((msg) => ({
          id: msg.id,
          session_id: msg.sessionId,
          role: msg.role,
          content: msg.content,
          created_at: msg.createdAt,
        })),
      });
    }
  );

  // POST /api/chat/sessions/:id/messages - Send a user message and get AI response
  fastify.post(
    '/api/chat/sessions/:id/messages',
    {
      schema: {
        description: 'Send a user message and get an AI response',
        tags: ['chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Messages created successfully',
            type: 'object',
            properties: {
              user_message: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  session_id: { type: 'string', format: 'uuid' },
                  role: { type: 'string' },
                  content: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
              assistant_message: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  session_id: { type: 'string', format: 'uuid' },
                  role: { type: 'string' },
                  content: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          404: {
            description: 'Session not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            description: 'AI service unavailable',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: SendMessageBody }>,
      reply: FastifyReply
    ) => {
      const { id: sessionId } = request.params;
      const { content } = request.body;

      app.logger.info({ sessionId, userMessage: content }, 'Processing user message');

      // Verify session exists
      const session = await app.db.query.chatSessions.findFirst({
        where: eq(schema.chatSessions.id, sessionId),
      });

      if (!session) {
        app.logger.warn({ sessionId }, 'Chat session not found');
        return reply.status(404).send({ error: 'Session not found' });
      }

      try {
        // Insert user message
        const [userMessage] = await app.db
          .insert(schema.chatMessages)
          .values({
            sessionId,
            role: 'user',
            content,
          })
          .returning();

        app.logger.info({ messageId: userMessage.id }, 'User message saved');

        // Get last 20 messages for context
        const messages = await app.db
          .select()
          .from(schema.chatMessages)
          .where(eq(schema.chatMessages.sessionId, sessionId))
          .orderBy(schema.chatMessages.createdAt);

        const contextMessages = messages.slice(-20).map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

        // Call AI with conversation history
        app.logger.info({ messageCount: contextMessages.length }, 'Calling AI with context');

        const { text: aiResponse } = await generateText({
          model: gateway('anthropic/claude-sonnet-4-6'),
          system: SYSTEM_PROMPT,
          messages: contextMessages,
        });

        // Insert assistant response
        const [assistantMessage] = await app.db
          .insert(schema.chatMessages)
          .values({
            sessionId,
            role: 'assistant',
            content: aiResponse,
          })
          .returning();

        app.logger.info({ messageId: assistantMessage.id }, 'AI response saved');

        // Get total message count after insert
        const totalMessages = await app.db
          .select()
          .from(schema.chatMessages)
          .where(eq(schema.chatMessages.sessionId, sessionId));

        // If this was the first user message (count == 2 after insert: 1 user + 1 assistant), auto-generate title
        if (totalMessages.length === 2) {
          const newTitle = truncateToWordBoundary(content, 60);
          await app.db
            .update(schema.chatSessions)
            .set({ title: newTitle, updatedAt: new Date() })
            .where(eq(schema.chatSessions.id, sessionId));

          app.logger.info({ sessionId, newTitle }, 'Session title auto-generated');
        } else {
          // Update session updated_at
          await app.db
            .update(schema.chatSessions)
            .set({ updatedAt: new Date() })
            .where(eq(schema.chatSessions.id, sessionId));
        }

        app.logger.info(
          { userMessageId: userMessage.id, assistantMessageId: assistantMessage.id },
          'Chat exchange completed'
        );

        return reply.status(201).send({
          user_message: {
            id: userMessage.id,
            session_id: userMessage.sessionId,
            role: userMessage.role,
            content: userMessage.content,
            created_at: userMessage.createdAt,
          },
          assistant_message: {
            id: assistantMessage.id,
            session_id: assistantMessage.sessionId,
            role: assistantMessage.role,
            content: assistantMessage.content,
            created_at: assistantMessage.createdAt,
          },
        });
      } catch (error) {
        app.logger.error({ err: error, sessionId }, 'AI service error');
        return reply
          .status(500)
          .send({ error: 'AI service unavailable. Please try again.' });
      }
    }
  );
}

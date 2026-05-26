import { eq, sql, and } from 'drizzle-orm';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import * as schema from './schema/schema.js';
import type { App } from '../index.js';

const TITLE_GENERATION_PROMPT = `You name accounting/tax/audit chat threads. Given the user's question, return a 2–4 word Title Case topic label naming the specific subject (e.g. 'Deferred Tax', 'VAT Apportionment', 'IFRS 16 Leases', 'Going Concern Audit'). No quotes, no punctuation, no trailing period. Just the label.`;

function truncateToWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  let truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > maxLength * 0.7) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }

  return truncated.trim();
}

async function generateTitleFromMessage(app: App, userMessage: string): Promise<string> {
  try {
    // Use Promise.race with a timeout to prevent hanging
    const titlePromise = (async () => {
      const result = await generateText({
        model: gateway('openai/gpt-4o-mini'),
        system: TITLE_GENERATION_PROMPT,
        prompt: userMessage,
      });
      return result.text;
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Title generation timeout')), 5000)
    );

    const generatedTitle = await Promise.race([titlePromise, timeoutPromise]);

    const trimmed = (generatedTitle || '').trim();
    if (trimmed) {
      return trimmed;
    }

    return truncateToWordBoundary(userMessage, 40);
  } catch (error) {
    app.logger.warn({ err: error }, 'Title generation failed during backfill, falling back to truncation');
    return truncateToWordBoundary(userMessage, 40);
  }
}

export async function backfillSessionTitles(app: App): Promise<void> {
  // Run backfill in the background without blocking server startup
  setImmediate(async () => {
    try {
      app.logger.info('Starting session title backfill migration');

      // Query sessions that need backfill:
      // - title length > 40 (likely user questions)
      // - title contains '?' (question marks)
      const sessionsToBackfill = await app.db
        .select()
        .from(schema.chatSessions)
        .where(
          sql`${schema.chatSessions.title} LIKE '%?%' OR length(${schema.chatSessions.title}) > 40`
        );

      app.logger.info({ count: sessionsToBackfill.length }, 'Found sessions to backfill');

      // Skip backfill if there are too many sessions to avoid overwhelming the API
      if (sessionsToBackfill.length > 20) {
        app.logger.warn({ count: sessionsToBackfill.length }, 'Too many sessions to backfill, skipping');
        return;
      }

      for (const session of sessionsToBackfill) {
        try {
          // Find the first user message for this session
          const [firstUserMessage] = await app.db
            .select()
            .from(schema.chatMessages)
            .where(
              and(
                eq(schema.chatMessages.sessionId, session.id),
                eq(schema.chatMessages.role, 'user')
              )
            )
            .orderBy(schema.chatMessages.createdAt)
            .limit(1);

          if (!firstUserMessage) {
            app.logger.debug({ sessionId: session.id }, 'No user message found, skipping');
            continue;
          }

          // Generate new title from the first user message
          const newTitle = await generateTitleFromMessage(app, firstUserMessage.content);

          // Update the session title
          await app.db
            .update(schema.chatSessions)
            .set({ title: newTitle, updatedAt: new Date() })
            .where(eq(schema.chatSessions.id, session.id));

          app.logger.info(
            { sessionId: session.id, oldTitle: session.title, newTitle },
            'Session title backfilled'
          );

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          app.logger.error(
            { err: error, sessionId: session.id },
            'Error backfilling session title'
          );
          // Continue to next session
        }
      }

      app.logger.info('Session title backfill migration completed');
    } catch (error) {
      app.logger.error({ err: error }, 'Error during session title backfill migration');
    }
  });
}

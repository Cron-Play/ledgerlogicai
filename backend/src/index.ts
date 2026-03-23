import { createApplication } from "@specific-dev/framework";
import { eq } from 'drizzle-orm';
import * as schema from './db/schema/schema.js';
import { registerChatRoutes } from './routes/chat.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Register routes
registerChatRoutes(app, app.fastify);

// Seed data
async function seedDatabase() {
  try {
    // Check if seed data already exists
    const existingSession = await app.db.query.chatSessions.findFirst({
      where: eq(schema.chatSessions.title, 'VAT Registration Threshold 2024'),
    });

    if (existingSession) {
      app.logger.info('Seed data already exists, skipping');
      return;
    }

    app.logger.info('Seeding database with chat sessions and messages');

    // Session 1: VAT Registration Threshold 2024
    const session1Date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const [session1] = await app.db
      .insert(schema.chatSessions)
      .values({
        title: 'VAT Registration Threshold 2024',
        userId: null,
        createdAt: session1Date,
        updatedAt: session1Date,
      })
      .returning();

    let messageTime = new Date(session1Date.getTime());
    await app.db.insert(schema.chatMessages).values({
      sessionId: session1.id,
      role: 'user',
      content:
        'What is the current VAT registration threshold in South Africa and when does a business become liable to register?',
      createdAt: messageTime,
    });

    messageTime = new Date(messageTime.getTime() + 1000);
    await app.db.insert(schema.chatMessages).values({
      sessionId: session1.id,
      role: 'assistant',
      content: `## VAT Registration Threshold\n\nIn terms of **section 23 of the Value-Added Tax Act No. 89 of 1991**, a person becomes liable to register as a VAT vendor when the value of taxable supplies made in any consecutive 12-month period **exceeds R1 million**.\n\n### Compulsory Registration\n\nPer **section 23(1) of the VAT Act**, you must register within **21 days** of the date on which you became liable. The effective date of registration will be the date SARS determines, which is typically the first day of the tax period following the date of liability.\n\n### Voluntary Registration\n\nUnder **section 23(3) of the VAT Act**, a vendor may apply for voluntary registration if:\n- Taxable supplies have been made, or\n- There is a reasonable expectation that taxable supplies will exceed **R50,000** in the next 12 months\n\n### Key Practical Points\n\n1. **Monitoring threshold**: You must continuously monitor your rolling 12-month taxable supplies\n2. **Deemed supplies**: Certain deemed supplies (e.g., fringe benefits) count toward the threshold\n3. **Connected persons**: SARS may aggregate supplies of connected persons in certain circumstances\n4. **Penalty for late registration**: In terms of **section 59 of the Tax Administration Act No. 28 of 2011**, a penalty of 10% of the tax payable may be imposed for failure to register timeously\n\n> **Note**: Always verify the current threshold with the latest VAT Act amendments, as SARS may update these figures. As of the 2024/2025 tax year, the R1 million threshold remains unchanged.`,
      createdAt: messageTime,
    });

    // Session 2: IFRS 16 Lease Accounting Treatment
    const session2Date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    const [session2] = await app.db
      .insert(schema.chatSessions)
      .values({
        title: 'IFRS 16 Lease Accounting Treatment',
        userId: null,
        createdAt: session2Date,
        updatedAt: session2Date,
      })
      .returning();

    messageTime = new Date(session2Date.getTime());
    await app.db.insert(schema.chatMessages).values({
      sessionId: session2.id,
      role: 'user',
      content:
        'Can you explain how to account for an operating lease under IFRS 16? We have a 3-year office lease starting 1 January 2024 with monthly payments of R50,000.',
      createdAt: messageTime,
    });

    messageTime = new Date(messageTime.getTime() + 1000);
    await app.db.insert(schema.chatMessages).values({
      sessionId: session2.id,
      role: 'assistant',
      content: `## IFRS 16 Lease Accounting — Lessee Treatment\n\nUnder **IFRS 16** (effective for annual periods beginning on or after 1 January 2019), the distinction between operating and finance leases for **lessees** has been eliminated. All leases (with limited exceptions) must be recognised on the balance sheet.\n\n### Initial Recognition (IFRS 16.22–16.28)\n\nAt commencement date, you recognise:\n1. **Right-of-Use (ROU) Asset**\n2. **Lease Liability**\n\n### Your Specific Example\n\n**Lease details:**\n- Term: 3 years (36 months) from 1 January 2024\n- Monthly payment: R50,000\n- Total undiscounted payments: R1,800,000\n\n**Step 1: Calculate the Lease Liability (IFRS 16.26)**\n\nThe lease liability is the present value of future lease payments, discounted at the **incremental borrowing rate (IBR)** if the implicit rate cannot be readily determined (IFRS 16.26).\n\nAssuming an IBR of **10% per annum** (0.8333% per month):\n\nPV of annuity = R50,000 × [(1 - (1.008333)^-36) / 0.008333]\n≈ R50,000 × 31.336\n≈ **R1,566,800** (lease liability at commencement)\n\n**Step 2: Measure the ROU Asset (IFRS 16.24)**\n\nROU Asset = Lease Liability + Initial direct costs + Prepayments - Lease incentives received\n= R1,566,800 (assuming no other adjustments)\n= **R1,566,800**\n\n### Subsequent Measurement\n\n**Lease Liability (IFRS 16.36):**\n- Increase by interest (IBR × carrying amount)\n- Decrease by lease payments made\n- Use the effective interest method\n\n**ROU Asset (IFRS 16.31):**\n- Depreciate on a straight-line basis over the lease term (3 years)\n- Monthly depreciation = R1,566,800 / 36 = **R43,522 per month**\n\n### Journal Entries — Month 1 (January 2024)\n\n| Description | Dr | Cr |\n|---|---|---|\n| ROU Asset | R1,566,800 | |\n| Lease Liability | | R1,566,800 |\n| *Initial recognition* | | |\n| Interest expense (P&L) | R13,057 | |\n| Lease Liability | R36,943 | |\n| Bank | | R50,000 |\n| *Monthly payment* | | |\n| Depreciation (P&L) | R43,522 | |\n| Accumulated depreciation | | R43,522 |\n| *Monthly depreciation* | | |\n\n### Exemptions (IFRS 16.5)\n\nYou may elect **not** to apply IFRS 16 to:\n1. **Short-term leases** (lease term ≤ 12 months)\n2. **Low-value assets** (underlying asset value ≤ approximately USD 5,000 when new)\n\n### IFRS for SMEs Difference\n\nUnder **IFRS for SMEs Section 20**, the old operating/finance lease distinction is **retained**. An operating lease under IFRS for SMEs is simply expensed on a straight-line basis — no ROU asset or lease liability is recognised.\n\n> **Disclosure**: IFRS 16.47–16.60 requires extensive disclosures including a maturity analysis of lease liabilities, ROU asset movements, and qualitative information about leasing activities.`,
      createdAt: messageTime,
    });

    messageTime = new Date(messageTime.getTime() + 1000);
    await app.db.insert(schema.chatMessages).values({
      sessionId: session2.id,
      role: 'user',
      content:
        'What discount rate should we use if we don\'t know the implicit rate in the lease?',
      createdAt: messageTime,
    });

    messageTime = new Date(messageTime.getTime() + 1000);
    await app.db.insert(schema.chatMessages).values({
      sessionId: session2.id,
      role: 'assistant',
      content: `## Determining the Incremental Borrowing Rate (IBR)\n\nPer **IFRS 16.26**, when the interest rate implicit in the lease cannot be readily determined, the lessee must use its **incremental borrowing rate (IBR)**.\n\n### Definition of IBR (IFRS 16 Appendix A)\n\nThe IBR is defined as: *"the rate of interest that a lessee would have to pay to borrow over a similar term, and with a similar security, the funds necessary to obtain an asset of a similar value to the right-of-use asset in a similar economic environment.\"*\n\n### Practical Approach for South African Entities\n\n**Building blocks approach (IFRS 16.BC162):**\n\n1. **Risk-free rate**: Use the South African government bond yield for a term matching the lease (e.g., R186 or R2030 bonds from the JSE)\n2. **Credit spread**: Add the entity's credit spread based on its credit rating and borrowing history\n3. **Lease-specific adjustments**: Adjust for the nature and quality of the underlying asset as collateral\n\n**Practical reference rates (as a starting point):**\n- South African Prime Rate is currently **11.75%** (verify with SARB for current rate)\n- Many South African entities use Prime minus 1% to Prime plus 2% depending on creditworthiness\n- For property leases, typical IBRs range from **10%–14%** in the current SA interest rate environment\n\n### IFRS 16.BC160 Practical Expedient\n\nFor a **portfolio of leases** with similar characteristics, you may apply a single IBR rather than determining one for each individual lease — this is a significant practical relief.\n\n### Documentation Requirements\n\nSAICA and auditors will expect you to document:\n1. The methodology used to determine the IBR\n2. The inputs and assumptions\n3. Evidence of the rate (e.g., bank quotes, bond yields)\n4. How the rate reflects the specific lease term and asset\n\n> **Audit consideration**: Per **ISA 540 (Revised)** on auditing accounting estimates, auditors will scrutinise IBR determinations as a key estimate. Ensure your methodology is well-documented and supportable.`,
      createdAt: messageTime,
    });

    // Update session 2 updatedAt to most recent message time
    await app.db
      .update(schema.chatSessions)
      .set({ updatedAt: messageTime })
      .where(eq(schema.chatSessions.id, session2.id));

    // Session 3: Section 11(a) Deduction Requirements
    const session3Date = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const [session3] = await app.db
      .insert(schema.chatSessions)
      .values({
        title: 'Section 11(a) Deduction Requirements',
        userId: null,
        createdAt: session3Date,
        updatedAt: session3Date,
      })
      .returning();

    messageTime = new Date(session3Date.getTime());
    await app.db.insert(schema.chatMessages).values({
      sessionId: session3.id,
      role: 'user',
      content: 'What are the requirements for a deduction under section 11(a) of the Income Tax Act?',
      createdAt: messageTime,
    });

    messageTime = new Date(messageTime.getTime() + 1000);
    await app.db.insert(schema.chatMessages).values({
      sessionId: session3.id,
      role: 'assistant',
      content: `## Section 11(a) General Deduction Formula\n\n**Section 11(a) of the Income Tax Act No. 58 of 1962** is the primary general deduction provision. It allows a deduction for expenditure and losses actually incurred in the production of income, provided they are not of a capital nature.\n\n### The Five Requirements\n\nBased on the wording of section 11(a) and confirmed by extensive case law, five requirements must ALL be met:\n\n#### 1. Expenditure or Loss\nThere must be an **actual outgoing** — a diminution of assets or increase in liabilities. A contingent liability is generally not deductible until it becomes unconditional (*Edgars Stores Ltd v CIR*).\n\n#### 2. Actually Incurred\nThe expenditure must be **actually incurred** during the year of assessment. This means an unconditional legal obligation to pay must exist, even if payment has not yet been made (*Caltex Oil (SA) Ltd v SIR* 1975).\n\n#### 3. In the Production of Income\nThere must be a **sufficiently close link** between the expenditure and the production of income. The test is whether the expenditure was incurred as part of the income-earning operations (*Port Elizabeth Electric Tramway Co Ltd v CIR* 1936 — the dominant purpose test).\n\n> The **dominant purpose** test: Was the dominant purpose of incurring the expenditure to produce income?\n\n#### 4. Not of a Capital Nature\nThe expenditure must be **revenue** in nature, not capital. The distinction:\n- **Revenue**: Expenditure to maintain or repair the income-earning structure (deductible)\n- **Capital**: Expenditure to create, improve, or add to the income-earning structure (not deductible under s11(a))\n\nKey cases: *New State Areas Ltd v CIR* 1946; *BP Southern Africa (Pty) Ltd v CSARS* 2006\n\n#### 5. Not Otherwise Prohibited\nThe deduction must not be **prohibited** by any other provision of the Act (e.g., section 23 prohibitions).\n\n### Section 23 Prohibitions to Note\n\n| Section | Prohibition |\n|---|---|\n| s23(a) | Domestic or private expenditure |\n| s23(b) | Expenses recoverable under insurance |\n| s23(c) | Losses not connected to trade |\n| s23(g) | Expenditure not for purposes of trade |\n| s23(m) | Certain employee deductions |\n\n### Practical Examples\n\n**Deductible under s11(a):**\n- Rent for business premises\n- Salaries and wages (also covered by s11(a))\n- Stationery and consumables\n- Bank charges on business accounts\n- Professional fees (legal, accounting) for revenue matters\n\n**NOT deductible under s11(a):**\n- Legal fees to defend title to a capital asset (*Capital nature*)\n- Fines and penalties (*contra bonos mores* — against public policy)\n- Pre-trade expenditure (consider s11A instead)\n- Personal expenses of the taxpayer\n\n### Pre-Trade Expenditure — Section 11A\n\nNote that **section 11A** (inserted by the Taxation Laws Amendment Act) allows a deduction for pre-trade expenditure that would have qualified under s11(a), but only in the year that income is first derived.\n\n> **SARS Guidance**: Refer to **SARS Interpretation Note 33** on assessed losses and the interaction with the general deduction formula. Always verify with the latest version of the Act, as amendments are frequent.`,
      createdAt: messageTime,
    });

    app.logger.info('Database seed completed successfully');
  } catch (error) {
    app.logger.error({ err: error }, 'Error seeding database');
  }
}

// Run application
await seedDatabase();
await app.run();
app.logger.info('Application running');

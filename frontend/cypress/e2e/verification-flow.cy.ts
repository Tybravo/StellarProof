import { installFreighterStub, TEST_PUBLIC_KEY } from '../support/freighter';

/**
 * End-to-end test for the verification workflow:
 *   Upload -> Manifest -> Privacy -> Request (mint) -> confirmation.
 *
 * Prerequisites (see frontend/README.md):
 *   - the app is running at CYPRESS_BASE_URL (default http://localhost:3000)
 *   - it was started with NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID set to a valid
 *     contract id, e.g. CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
 *
 * Freighter and Horizon are stubbed, so no wallet or network access is needed.
 * The wizard has no transaction-status polling UI yet (TransactionTracker is
 * not mounted anywhere), so the "poll" stage is not covered here.
 */

const TX_HASH = 'a'.repeat(64);

function stubHorizon(mode: 'success' | 'failure') {
  cy.intercept('GET', '**/accounts/*', {
    statusCode: 200,
    body: { id: TEST_PUBLIC_KEY, account_id: TEST_PUBLIC_KEY, sequence: '1', balances: [] },
  }).as('loadAccount');

  if (mode === 'success') {
    cy.intercept('POST', '**/transactions', {
      statusCode: 200,
      body: { hash: TX_HASH, ledger: 100, successful: true, result_xdr: 'AAAAAAAAAGQAAAAAAAAAAAAAAAA=' },
    }).as('submitTx');
  } else {
    cy.intercept('POST', '**/transactions', {
      statusCode: 400,
      body: {
        title: 'Transaction Failed',
        status: 400,
        extras: { result_codes: { transaction: 'tx_failed', operations: ['op_underfunded'] } },
      },
    }).as('submitTx');
  }
}

function completeWizardUpToReview(options?: { rejectSigning?: boolean }) {
  cy.visit('/verify', {
    onBeforeLoad: (win) => installFreighterStub(win, options),
  });
  cy.get('input[type="file"]').selectFile(
    { contents: Cypress.Buffer.from('stellarproof e2e payload'), fileName: 'proof.txt', mimeType: 'text/plain' },
    { force: true }
  );
  cy.contains('SHA-256 Hash').should('be.visible');

  cy.get('button[aria-label="Go to next step"]').click(); // Media -> Manifest
  cy.get('button[aria-label="Go to next step"]').click(); // Manifest -> Privacy
  cy.get('button[aria-label="Go to next step"]').click(); // Privacy -> Review

  cy.get('#wizard-step-heading').should('have.text', 'Review & Submit');
  cy.contains('proof.txt').should('be.visible');
}

describe('Verification flow: upload to mint', () => {
  // Next.js dev mode reports React hydration mismatches from the shared layout
  // as uncaught exceptions; they are unrelated to the flow under test.
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (/Hydration failed/i.test(err.message)) return false;
    });
  });

  it('uploads, reviews, mints and shows copyable transaction details', () => {
    stubHorizon('success');
    completeWizardUpToReview();

    cy.get('input[type="checkbox"]').check();
    cy.contains('button', 'Submit Record').click();

    cy.wait('@loadAccount');
    cy.wait('@submitTx');
    cy.contains('Verification Submitted Successfully!').should('be.visible');
    cy.contains(TX_HASH).should('be.visible');

    // The copy button writes the exact transaction hash.
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('writeText').resolves();
    });
    cy.get('button[aria-label="Copy transaction hash"]').click();
    cy.get('@writeText').should('have.been.calledOnceWithExactly', TX_HASH);
  });

  it('shows a recoverable error when the mint transaction fails on-chain', () => {
    stubHorizon('failure');
    completeWizardUpToReview();

    cy.get('input[type="checkbox"]').check();
    cy.contains('button', 'Submit Record').click();

    cy.wait('@submitTx');
    cy.get('[role="alert"]').should('contain.text', 'Transaction failed on-chain');
    cy.get('[data-testid="mint-error-message"]').should('contain.text', 'tx_failed');
    cy.contains('Verification Submitted Successfully!').should('not.exist');

    // Try Again returns to the confirmation UI with the review still intact.
    cy.contains('button', 'Try Again').click();
    cy.contains('button', 'Submit Record').should('be.visible');
    cy.contains('proof.txt').should('be.visible');
  });

  it('shows a clear message when the user declines signing', () => {
    stubHorizon('success');
    completeWizardUpToReview({ rejectSigning: true });

    cy.get('input[type="checkbox"]').check();
    cy.contains('button', 'Submit Record').click();

    cy.get('[role="alert"]').should('contain.text', 'Signing request declined');
    cy.get('@submitTx.all').should('have.length', 0);
  });
});

/**
 * Minimal stand-in for the Freighter browser extension.
 *
 * @stellar/freighter-api talks to the extension with window.postMessage: it
 * posts { source: 'FREIGHTER_EXTERNAL_MSG_REQUEST', messageId, type, ... } and
 * waits for { source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE', messagedId, ... }.
 * This replies to the request types the verification flow uses.
 */
export const TEST_PUBLIC_KEY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
export const TEST_PASSPHRASE = 'Test SDF Network ; September 2015';

interface FreighterRequest {
  source?: string;
  messageId?: number;
  type?: string;
  transactionXdr?: string;
}

export function installFreighterStub(win: Window, options: { rejectSigning?: boolean } = {}) {
  (win as unknown as { freighter: boolean }).freighter = true;

  win.addEventListener('message', (event: MessageEvent<FreighterRequest>) => {
    const data = event.data;
    if (event.source !== win || !data || data.source !== 'FREIGHTER_EXTERNAL_MSG_REQUEST') return;

    // The API only accepts replies whose event.source is the app window, so a
    // synthetic event is dispatched (postMessage from the spec frame would
    // report the spec window as the source).
    const reply = (payload: Record<string, unknown>) =>
      win.dispatchEvent(
        new (win as unknown as { MessageEvent: typeof MessageEvent }).MessageEvent('message', {
          data: { source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE', messagedId: data.messageId, ...payload },
          source: win,
          origin: win.location.origin,
        })
      );

    switch (data.type) {
      case 'REQUEST_CONNECTION_STATUS':
        reply({ isConnected: true });
        break;
      case 'REQUEST_ACCESS':
      case 'REQUEST_PUBLIC_KEY':
        reply({ publicKey: TEST_PUBLIC_KEY });
        break;
      case 'REQUEST_NETWORK_DETAILS':
        reply({
          networkDetails: {
            network: 'TESTNET',
            networkName: 'Test Network',
            networkUrl: 'https://horizon-testnet.stellar.org',
            networkPassphrase: TEST_PASSPHRASE,
          },
        });
        break;
      case 'SUBMIT_TRANSACTION':
        if (options.rejectSigning) {
          reply({
            signedTransaction: '',
            signerAddress: '',
            apiError: { code: -4, message: 'User declined access' },
          });
        } else {
          reply({ signedTransaction: data.transactionXdr, signerAddress: TEST_PUBLIC_KEY });
        }
        break;
      default:
        reply({});
    }
  });
}

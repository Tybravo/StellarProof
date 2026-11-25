/**
 * Unit tests for the XLM checkout modal: rendering and payment summary,
 * Freighter wallet access, transaction building/signing, and the success,
 * failure and in-flight ("signing") states.
 *
 * Every wallet and blockchain interaction is mocked. `@stellar/freighter-api`
 * and `@stellar/stellar-sdk` are replaced with jest mocks, so the suite makes
 * no network calls and never touches a real wallet, key or transaction.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { BASE_FEE, Networks } from "@stellar/stellar-sdk";
import { requestAccess, signTransaction } from "@stellar/freighter-api";

jest.mock("@stellar/freighter-api", () => ({
  __esModule: true,
  requestAccess: jest.fn(),
  signTransaction: jest.fn(),
}));

jest.mock("@stellar/stellar-sdk", () => {
  const builder = {
    addOperation: jest.fn(),
    addMemo: jest.fn(),
    setTimeout: jest.fn(),
    build: jest.fn(),
  };
  const builtTransaction = { toXDR: jest.fn() };
  const server = { loadAccount: jest.fn(), submitTransaction: jest.fn() };
  const TransactionBuilder = Object.assign(jest.fn(), { fromXDR: jest.fn() });
  const Server = jest.fn();
  const Asset = { native: jest.fn() };
  const Memo = { text: jest.fn() };
  const Operation = { payment: jest.fn() };

  return {
    __esModule: true,
    BASE_FEE: "100",
    Networks: {
      TESTNET: "Test SDF Network ; September 2015",
      PUBLIC: "Public Global Stellar Network ; September 2015",
    },
    Asset,
    Memo,
    Operation,
    TransactionBuilder,
    Horizon: { Server },
    // Handles used by the tests only; the component never reads this key.
    __testMocks: { builder, builtTransaction, server, TransactionBuilder, Server, Asset, Memo, Operation },
  };
});

interface StellarSdkTestMocks {
  builder: { addOperation: jest.Mock; addMemo: jest.Mock; setTimeout: jest.Mock; build: jest.Mock };
  builtTransaction: { toXDR: jest.Mock };
  server: { loadAccount: jest.Mock; submitTransaction: jest.Mock };
  TransactionBuilder: jest.Mock & { fromXDR: jest.Mock };
  Server: jest.Mock;
  Asset: { native: jest.Mock };
  Memo: { text: jest.Mock };
  Operation: { payment: jest.Mock };
}

const sdk = (jest.requireMock("@stellar/stellar-sdk") as { __testMocks: StellarSdkTestMocks }).__testMocks;
const mockRequestAccess = jest.mocked(requestAccess);
const mockSignTransaction = jest.mocked(signTransaction);

type RequestAccessResult = Awaited<ReturnType<typeof requestAccess>>;
type SignTransactionResult = Awaited<ReturnType<typeof signTransaction>>;
type XLMCheckoutModalComponent = (typeof import("../XLMCheckoutModal"))["default"];
type ModalProps = React.ComponentProps<XLMCheckoutModalComponent>;

const WALLET_ADDRESS = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const ENV_MERCHANT_ADDRESS = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const PROP_MERCHANT_ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const UNSIGNED_XDR = "unsigned-xdr-fixture";
const SIGNED_XDR = "signed-xdr-fixture";
const TX_HASH = "4f1a0c9b7e2d41f0b6e5c8d3a9174bc25e0f8a6d3c4b5e6f7a8901b2c3d4e5f6";
const ACCOUNT = { accountId: () => WALLET_ADDRESS, sequenceNumber: () => "1" };
const NATIVE_ASSET = { code: "XLM", isNative: true };
const PARSED_SIGNED_TX = { hash: () => TX_HASH };
const LONG_MEMO = "An extremely long checkout memo that Freighter cannot fit";

const ENV_KEYS = [
  "NEXT_PUBLIC_CHECKOUT_MERCHANT_ADDRESS",
  "NEXT_PUBLIC_VITE_HORIZON_URL",
  "NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE",
] as const;

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

// The component derives the Horizon URL, network passphrase and default
// merchant address from the environment at MODULE LOAD time, so it is loaded
// lazily here - after the environment has been pinned to known values - rather
// than imported at the top of the file.
let XLMCheckoutModal!: XLMCheckoutModalComponent;

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderModal = (
  overrides: Omit<Partial<ModalProps>, "onClose" | "onSuccess" | "onError"> = {},
) => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();
  const onError = jest.fn();
  const props: ModalProps = {
    isOpen: true,
    amountXLM: "25",
    onClose,
    onSuccess,
    onError,
    ...overrides,
  };
  const view = render(<XLMCheckoutModal {...props} />);
  return { ...view, onClose, onSuccess, onError, user: userEvent.setup() };
};

const payButton = () => screen.getByRole("button", { name: /xlm|freighter|payment complete/i });

const clickPay = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /sign and pay with xlm/i }));
};

beforeAll(async () => {
  ENV_KEYS.forEach((key) => {
    originalEnv[key] = process.env[key];
  });
  process.env.NEXT_PUBLIC_CHECKOUT_MERCHANT_ADDRESS = ENV_MERCHANT_ADDRESS;
  process.env.NEXT_PUBLIC_VITE_HORIZON_URL = HORIZON_URL;
  process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE = Networks.TESTNET;
  XLMCheckoutModal = (await import("../XLMCheckoutModal")).default;
});

afterAll(() => {
  ENV_KEYS.forEach((key) => {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
});

beforeEach(() => {
  jest.resetAllMocks();

  // Happy-path wiring, re-established for every test so each one starts from
  // the same deterministic baseline.
  sdk.Server.mockReturnValue(sdk.server);
  sdk.server.loadAccount.mockResolvedValue(ACCOUNT);
  sdk.server.submitTransaction.mockResolvedValue({ hash: TX_HASH });
  sdk.TransactionBuilder.mockReturnValue(sdk.builder);
  sdk.TransactionBuilder.fromXDR.mockReturnValue(PARSED_SIGNED_TX);
  sdk.builder.addOperation.mockReturnValue(sdk.builder);
  sdk.builder.addMemo.mockReturnValue(sdk.builder);
  sdk.builder.setTimeout.mockReturnValue(sdk.builder);
  sdk.builder.build.mockReturnValue(sdk.builtTransaction);
  sdk.builtTransaction.toXDR.mockReturnValue(UNSIGNED_XDR);
  sdk.Asset.native.mockReturnValue(NATIVE_ASSET);
  sdk.Memo.text.mockImplementation((text: string) => ({ type: "text", value: text }));
  sdk.Operation.payment.mockImplementation((options: unknown) => ({ type: "payment", options }));
  mockRequestAccess.mockResolvedValue({ address: WALLET_ADDRESS });
  mockSignTransaction.mockResolvedValue({ signedTxXdr: SIGNED_XDR, signerAddress: WALLET_ADDRESS });
});

describe("XLMCheckoutModal", () => {
  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = renderModal({ isOpen: false });

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders an accessible modal dialog when open", () => {
      renderModal();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "xlm-checkout-title");
      expect(dialog).toHaveAccessibleName("XLM checkout");
      expect(screen.getByRole("heading", { name: "XLM checkout" })).toHaveAttribute(
        "id",
        "xlm-checkout-title",
      );
      expect(screen.getByRole("button", { name: "Close checkout" })).toBeInTheDocument();
    });

    it("starts idle: pay button enabled and no status message", () => {
      renderModal();

      const button = screen.getByRole("button", { name: /sign and pay with xlm/i });
      expect(button).toBeEnabled();
      expect(screen.queryByText(/waiting for freighter signature/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("transaction-animation-success")).not.toBeInTheDocument();
      expect(screen.queryByTestId("transaction-animation-error")).not.toBeInTheDocument();
    });

    it("shows the amount, the BASE_FEE-derived network fee and the total", () => {
      renderModal({ amountXLM: "25" });

      const expectedFee = (Number(BASE_FEE) / 10_000_000).toFixed(7);
      expect(expectedFee).toBe("0.0000100");

      expect(screen.getByText("Amount")).toBeInTheDocument();
      expect(screen.getByText("25 XLM")).toBeInTheDocument();
      expect(screen.getByText("Network fee")).toBeInTheDocument();
      expect(screen.getByText("0.0000100 XLM")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("25.0000100 XLM")).toBeInTheDocument();
    });

    it("adds the network fee to a fractional amount with 7-decimal precision", () => {
      renderModal({ amountXLM: "0.5" });

      expect(screen.getByText("0.5 XLM")).toBeInTheDocument();
      expect(screen.getByText("0.5000100 XLM")).toBeInTheDocument();
    });

    it("calls onClose when the close button is pressed", async () => {
      const { onClose, user } = renderModal();

      await user.click(screen.getByRole("button", { name: "Close checkout" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("wallet access", () => {
    it("requests Freighter access when the payment starts", async () => {
      const { user } = renderModal();

      await clickPay(user);

      await waitFor(() => expect(mockRequestAccess).toHaveBeenCalledTimes(1));
    });

    it("surfaces a rejected access request and does not build a transaction", async () => {
      mockRequestAccess.mockResolvedValue({
        address: "",
        error: { code: -1, message: "User declined access" },
      });
      const { onError, onSuccess, user } = renderModal();

      await clickPay(user);

      expect(await screen.findByText("User declined access")).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("User declined access");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(sdk.Server).not.toHaveBeenCalled();
      expect(sdk.TransactionBuilder).not.toHaveBeenCalled();
      expect(mockSignTransaction).not.toHaveBeenCalled();
    });

    it("falls back to a generic denial message when no address is returned", async () => {
      mockRequestAccess.mockResolvedValue({ address: "" });
      const { onError, user } = renderModal();

      await clickPay(user);

      expect(await screen.findByText("Freighter wallet access was denied.")).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("Freighter wallet access was denied.");
      expect(mockSignTransaction).not.toHaveBeenCalled();
    });

    it("reports a thrown Freighter error (extension unavailable)", async () => {
      mockRequestAccess.mockRejectedValue(new Error("Freighter is not installed"));
      const { onError, user } = renderModal();

      await clickPay(user);

      expect(await screen.findByText("Freighter is not installed")).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("Freighter is not installed");
    });
  });

  describe("merchant address configuration", () => {
    it("defaults the destination to the configured merchant address", async () => {
      const { user } = renderModal();

      await clickPay(user);

      await waitFor(() =>
        expect(sdk.Operation.payment).toHaveBeenCalledWith({
          destination: ENV_MERCHANT_ADDRESS,
          asset: NATIVE_ASSET,
          amount: "25",
        }),
      );
    });

    it("prefers an explicit merchantAddress prop over the default", async () => {
      const { user } = renderModal({ merchantAddress: PROP_MERCHANT_ADDRESS });

      await clickPay(user);

      await waitFor(() =>
        expect(sdk.Operation.payment).toHaveBeenCalledWith(
          expect.objectContaining({ destination: PROP_MERCHANT_ADDRESS }),
        ),
      );
    });

    it("fails fast when the merchant address is not configured", async () => {
      const { onError, onSuccess, user } = renderModal({ merchantAddress: "" });

      await clickPay(user);

      expect(
        await screen.findByText("Checkout merchant address is not configured."),
      ).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("Checkout merchant address is not configured.");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(mockRequestAccess).not.toHaveBeenCalled();
      expect(screen.getByTestId("transaction-animation-error")).toBeInTheDocument();
    });
  });

  describe("transaction building and signing", () => {
    it("builds a native XLM payment on the configured network and submits it", async () => {
      const { user } = renderModal({ amountXLM: "12.5" });

      await clickPay(user);

      await waitFor(() => expect(sdk.server.submitTransaction).toHaveBeenCalledTimes(1));

      expect(sdk.Server).toHaveBeenCalledWith(HORIZON_URL);
      expect(sdk.server.loadAccount).toHaveBeenCalledWith(WALLET_ADDRESS);
      expect(sdk.TransactionBuilder).toHaveBeenCalledWith(ACCOUNT, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      });
      expect(sdk.Asset.native).toHaveBeenCalledTimes(1);
      expect(sdk.Operation.payment).toHaveBeenCalledWith({
        destination: ENV_MERCHANT_ADDRESS,
        asset: NATIVE_ASSET,
        amount: "12.5",
      });
      expect(sdk.builder.setTimeout).toHaveBeenCalledWith(60);
      expect(sdk.builder.build).toHaveBeenCalledTimes(1);
      expect(sdk.server.submitTransaction).toHaveBeenCalledWith(PARSED_SIGNED_TX);
    });

    it("uses the default memo and truncates a long memo to 28 characters", async () => {
      const { user, unmount } = renderModal();

      await clickPay(user);
      await waitFor(() => expect(sdk.Memo.text).toHaveBeenCalledWith("StellarProof checkout"));
      unmount();

      sdk.Memo.text.mockClear();
      const second = renderModal({ memo: LONG_MEMO });
      await clickPay(second.user);
      await waitFor(() => expect(sdk.Memo.text).toHaveBeenCalledTimes(1));

      const [memoArg] = sdk.Memo.text.mock.calls[0] as [string];
      expect(memoArg).toHaveLength(28);
      expect(LONG_MEMO.startsWith(memoArg)).toBe(true);
    });

    it("signs the built XDR with the wallet address and network passphrase", async () => {
      const { user } = renderModal();

      await clickPay(user);

      await waitFor(() => expect(mockSignTransaction).toHaveBeenCalledTimes(1));
      expect(sdk.builtTransaction.toXDR).toHaveBeenCalledTimes(1);
      expect(mockSignTransaction).toHaveBeenCalledWith(UNSIGNED_XDR, {
        address: WALLET_ADDRESS,
        networkPassphrase: Networks.TESTNET,
      });
      expect(sdk.TransactionBuilder.fromXDR).toHaveBeenCalledWith(SIGNED_XDR, Networks.TESTNET);
    });
  });

  describe("Freighter signature response shapes", () => {
    it("accepts a signed XDR returned as a raw string", async () => {
      mockSignTransaction.mockResolvedValue(SIGNED_XDR as unknown as SignTransactionResult);
      const { onSuccess, user } = renderModal();

      await clickPay(user);

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(TX_HASH));
      expect(sdk.TransactionBuilder.fromXDR).toHaveBeenCalledWith(SIGNED_XDR, Networks.TESTNET);
    });

    it("accepts a signed XDR returned as { signedTxXdr }", async () => {
      mockSignTransaction.mockResolvedValue({
        signedTxXdr: SIGNED_XDR,
        signerAddress: WALLET_ADDRESS,
      });
      const { onSuccess, user } = renderModal();

      await clickPay(user);

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(TX_HASH));
      expect(sdk.TransactionBuilder.fromXDR).toHaveBeenCalledWith(SIGNED_XDR, Networks.TESTNET);
    });

    it("accepts a signed XDR returned as { signedTransaction }", async () => {
      mockSignTransaction.mockResolvedValue({
        signedTransaction: SIGNED_XDR,
      } as unknown as SignTransactionResult);
      const { onSuccess, user } = renderModal();

      await clickPay(user);

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(TX_HASH));
      expect(sdk.TransactionBuilder.fromXDR).toHaveBeenCalledWith(SIGNED_XDR, Networks.TESTNET);
    });

    // Freighter reports a declined signature by resolving with an `error`
    // payload rather than rejecting. The component does not inspect that field
    // (it only checks the error returned by `requestAccess`), so a decline
    // currently surfaces as the generic "did not return a signed transaction"
    // message. This test pins the behaviour that ships today.
    it("reports a declined signature through the generic invalid-signature message", async () => {
      mockSignTransaction.mockResolvedValue({
        signedTxXdr: "",
        signerAddress: "",
        error: { code: -2, message: "User declined the signature request" },
      });
      const { onError, onSuccess, user } = renderModal();

      await clickPay(user);

      expect(
        await screen.findByText("Freighter did not return a signed transaction."),
      ).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("Freighter did not return a signed transaction.");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(sdk.server.submitTransaction).not.toHaveBeenCalled();
    });

    it.each([
      ["an empty object", {} as unknown as SignTransactionResult],
      ["null", null as unknown as SignTransactionResult],
      ["an unrelated payload", { signerAddress: WALLET_ADDRESS } as unknown as SignTransactionResult],
    ])("rejects an invalid signature response: %s", async (_label, response) => {
      mockSignTransaction.mockResolvedValue(response);
      const { onError, onSuccess, user } = renderModal();

      await clickPay(user);

      expect(
        await screen.findByText("Freighter did not return a signed transaction."),
      ).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("Freighter did not return a signed transaction.");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(sdk.TransactionBuilder.fromXDR).not.toHaveBeenCalled();
      expect(sdk.server.submitTransaction).not.toHaveBeenCalled();
    });
  });

  describe("successful payment", () => {
    it("shows the success state, renders the hash and calls onSuccess", async () => {
      const { onSuccess, onError, user } = renderModal();

      await clickPay(user);

      expect(await screen.findByText("Payment submitted successfully.")).toBeInTheDocument();
      expect(screen.getByText(`Tx: ${TX_HASH}`)).toBeInTheDocument();
      expect(screen.getByTestId("transaction-animation-success")).toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
      expect(onError).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /payment complete/i })).toBeDisabled();
    });
  });

  describe("failed payment", () => {
    it("reports a rejected transaction submission", async () => {
      sdk.server.submitTransaction.mockRejectedValue(new Error("tx_insufficient_balance"));
      const { onError, onSuccess, user } = renderModal();

      await clickPay(user);

      expect(await screen.findByText("tx_insufficient_balance")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-animation-error")).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("tx_insufficient_balance");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(screen.queryByText(/^Tx: /)).not.toBeInTheDocument();
    });

    it("reports a Horizon network error while loading the account", async () => {
      sdk.server.loadAccount.mockRejectedValue(new Error("Network request failed"));
      const { onError, user } = renderModal();

      await clickPay(user);

      expect(await screen.findByText("Network request failed")).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("Network request failed");
      expect(mockSignTransaction).not.toHaveBeenCalled();
    });

    it("falls back to a generic message for a non-Error failure", async () => {
      sdk.server.submitTransaction.mockRejectedValue("horizon exploded");
      const { onError, user } = renderModal();

      await clickPay(user);

      expect(await screen.findByText("Unable to complete payment.")).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith("Unable to complete payment.");
    });

    it("re-enables the pay button so a failed payment can be retried", async () => {
      sdk.server.submitTransaction
        .mockRejectedValueOnce(new Error("tx_too_late"))
        .mockResolvedValue({ hash: TX_HASH });
      const { onSuccess, user } = renderModal();

      await clickPay(user);
      expect(await screen.findByText("tx_too_late")).toBeInTheDocument();

      const retry = screen.getByRole("button", { name: /sign and pay with xlm/i });
      expect(retry).toBeEnabled();

      await user.click(retry);

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(TX_HASH));
      expect(sdk.server.submitTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe("signing state and duplicate submissions", () => {
    it("shows the in-flight signing state while Freighter is open", async () => {
      const deferred = createDeferred<RequestAccessResult>();
      mockRequestAccess.mockReturnValue(deferred.promise);
      const { user } = renderModal();

      await clickPay(user);

      const signingButton = await screen.findByRole("button", { name: /opening freighter/i });
      expect(signingButton).toBeDisabled();
      expect(signingButton.querySelector(".animate-spin")).not.toBeNull();
      expect(screen.getByText(/waiting for freighter signature/i)).toBeInTheDocument();
      expect(screen.queryByTestId("transaction-animation-success")).not.toBeInTheDocument();
      expect(screen.queryByTestId("transaction-animation-error")).not.toBeInTheDocument();

      deferred.resolve({ address: WALLET_ADDRESS });

      expect(await screen.findByText("Payment submitted successfully.")).toBeInTheDocument();
    });

    it("ignores further clicks while a payment is being signed", async () => {
      const deferred = createDeferred<RequestAccessResult>();
      mockRequestAccess.mockReturnValue(deferred.promise);
      const { user } = renderModal();

      await clickPay(user);
      await screen.findByRole("button", { name: /opening freighter/i });

      await user.click(payButton());
      await user.click(payButton());

      expect(mockRequestAccess).toHaveBeenCalledTimes(1);

      deferred.resolve({ address: WALLET_ADDRESS });
      expect(await screen.findByText("Payment submitted successfully.")).toBeInTheDocument();
      expect(sdk.server.submitTransaction).toHaveBeenCalledTimes(1);
    });

    it("ignores further clicks once the payment has succeeded", async () => {
      const { onSuccess, user } = renderModal();

      await clickPay(user);
      const completed = await screen.findByRole("button", { name: /payment complete/i });
      expect(completed).toBeDisabled();

      await user.click(completed);
      await user.click(payButton());

      expect(mockRequestAccess).toHaveBeenCalledTimes(1);
      expect(mockSignTransaction).toHaveBeenCalledTimes(1);
      expect(sdk.server.submitTransaction).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});

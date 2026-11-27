import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RotateKeyButton } from "./RotateKeyButton";
import { ToastProvider } from "@/context/ToastContext";
import { rotateKmsKey } from "@/services/kmsService";

jest.mock("framer-motion", () => {
  const react = jest.requireActual("react");
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const strip = (props: Record<string, unknown>) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    } = props;
    return rest;
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const cache: Record<string, unknown> = {};
  const motion = new Proxy(
    {},
    {
      get: (_target, tag) => {
        if (typeof tag !== "string") return undefined;
        if (!cache[tag]) {
          cache[tag] = react.forwardRef(
            (props: Record<string, unknown>, ref: unknown) =>
              react.createElement(tag, { ...strip(props), ref }),
          );
        }
        return cache[tag];
      },
    },
  );
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: unknown }) =>
      react.createElement(react.Fragment, null, children),
    useReducedMotion: () => true,
  };
});

jest.mock("@/services/kmsService", () => ({
  rotateKmsKey: jest.fn(),
}));

const mockedRotateKmsKey = rotateKmsKey as jest.MockedFunction<
  typeof rotateKmsKey
>;

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("RotateKeyButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Rotate Key trigger button", () => {
    renderWithToast(<RotateKeyButton userId="user-123" />);
    expect(
      screen.getByRole("button", { name: /rotate key/i }),
    ).toBeInTheDocument();
  });

  it("opens the confirmation modal with owner and key version details", async () => {
    const user = userEvent.setup();
    renderWithToast(
      <RotateKeyButton
        userId="owner-abc"
        assetId="SPV-001"
        currentKeyVersion="v1"
      />,
    );

    await user.click(screen.getByRole("button", { name: /rotate key/i }));

    expect(
      screen.getByRole("dialog", { name: /confirm kms key rotation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("owner-abc")).toBeInTheDocument();
    expect(screen.getByText("SPV-001")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
  });

  it("triggers rotation, shows loading state, and displays success feedback", async () => {
    const user = userEvent.setup();
    const onRotated = jest.fn();
    let resolveRotation!: (value: {
      oldKeyVersion: string;
      newKeyVersion: string;
      assetsReEncrypted: number;
    }) => void;

    mockedRotateKmsKey.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRotation = resolve;
        }),
    );

    renderWithToast(
      <RotateKeyButton
        userId="owner-abc"
        assetId="SPV-001"
        onRotated={onRotated}
      />,
    );

    await user.click(screen.getByRole("button", { name: /rotate key/i }));
    await user.click(screen.getByRole("button", { name: /confirm rotation/i }));

    expect(
      screen.getByRole("button", { name: /rotating key/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(mockedRotateKmsKey).toHaveBeenCalledWith("owner-abc", {
      assetId: "SPV-001",
    });

    resolveRotation({
      oldKeyVersion: "v1",
      newKeyVersion: "v2",
      assetsReEncrypted: 4,
    });

    await waitFor(() => {
      expect(
        screen.getByText(/key rotation completed successfully/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(onRotated).toHaveBeenCalledWith({
      oldKeyVersion: "v1",
      newKeyVersion: "v2",
      assetsReEncrypted: 4,
    });

    await user.click(screen.getByRole("button", { name: /done/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("displays error feedback when key rotation fails", async () => {
    const user = userEvent.setup();
    mockedRotateKmsKey.mockRejectedValue(
      new Error("No active KMS key found for user"),
    );

    renderWithToast(<RotateKeyButton userId="owner-abc" />);

    await user.click(screen.getByRole("button", { name: /rotate key/i }));
    await user.click(screen.getByRole("button", { name: /confirm rotation/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No active KMS key found for user");
    expect(
      screen.getByRole("button", { name: /confirm rotation/i }),
    ).not.toBeDisabled();
  });

  it("shows validation feedback when userId is missing", async () => {
    const user = userEvent.setup();
    renderWithToast(<RotateKeyButton />);

    await user.click(screen.getByRole("button", { name: /rotate key/i }));
    await user.click(screen.getByRole("button", { name: /confirm rotation/i }));

    expect(mockedRotateKmsKey).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /provide an owner id/i,
    );
  });
});

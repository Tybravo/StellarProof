import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModalProvider, useModal } from "@/components/ui/ModalProvider";

function OpenerButton({ content, size }: { content: React.ReactNode; size?: "sm" | "md" | "lg" | "full" }) {
  const { openModal } = useModal();
  return (
    <button type="button" onClick={() => openModal(content, { size })}>
      Open
    </button>
  );
}

function CloserButton() {
  const { closeModal } = useModal();
  return (
    <button type="button" onClick={closeModal}>
      Close from outside
    </button>
  );
}

describe("ModalProvider / useModal", () => {
  it("throws when useModal is called outside a ModalProvider", () => {
    function Bad() {
      useModal();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/useModal must be used within a ModalProvider/i);
  });

  it("renders nothing open by default", () => {
    render(
      <ModalProvider>
        <OpenerButton content={<p>Hello modal</p>} />
      </ModalProvider>
    );
    expect(screen.queryByText("Hello modal")).not.toBeInTheDocument();
  });

  it("opens a modal with arbitrary content when openModal is called", async () => {
    const user = userEvent.setup();
    render(
      <ModalProvider>
        <OpenerButton content={<p>Hello modal</p>} />
      </ModalProvider>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Hello modal")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the modal when closeModal is called from any component", async () => {
    const user = userEvent.setup();
    render(
      <ModalProvider>
        <OpenerButton content={<p>Hello modal</p>} />
        <CloserButton />
      </ModalProvider>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Hello modal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close from outside" }));
    await waitFor(() => expect(screen.queryByText("Hello modal")).not.toBeInTheDocument());
  });

  it("closes the modal on Escape and invokes the onClose callback", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    function Opener() {
      const { openModal } = useModal();
      return (
        <button type="button" onClick={() => openModal(<p>Escapable</p>, { onClose })}>
          Open
        </button>
      );
    }

    render(
      <ModalProvider>
        <Opener />
      </ModalProvider>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Escapable")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Escapable")).not.toBeInTheDocument());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("replaces the modal content when openModal is called again while open", async () => {
    const user = userEvent.setup();

    function MultiOpener() {
      const { openModal } = useModal();
      return (
        <>
          <button type="button" onClick={() => openModal(<p>First</p>)}>
            Open First
          </button>
          <button type="button" onClick={() => openModal(<p>Second</p>)}>
            Open Second
          </button>
        </>
      );
    }

    render(
      <ModalProvider>
        <MultiOpener />
      </ModalProvider>
    );

    await user.click(screen.getByRole("button", { name: "Open First" }));
    expect(await screen.findByText("First")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Second" }));
    expect(await screen.findByText("Second")).toBeInTheDocument();
    expect(screen.queryByText("First")).not.toBeInTheDocument();
  });
});

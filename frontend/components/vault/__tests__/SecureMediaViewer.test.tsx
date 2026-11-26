import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SecureMediaViewer } from "../SecureMediaViewer";

describe("SecureMediaViewer", () => {
  const mockCreateObjectURL = jest.fn(() => "blob:http://localhost/test-uuid-1234");
  const mockRevokeObjectURL = jest.fn();

  beforeAll(() => {
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      value: mockCreateObjectURL,
      writable: true,
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      value: mockRevokeObjectURL,
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockImplementation(() => "blob:http://localhost/test-uuid-1234");
  });

  it("renders in-memory decrypted image blob via URL.createObjectURL without exposing direct URL", () => {
    const mockBlob = new Blob(["fake-image-bytes"], { type: "image/png" });

    render(
      <SecureMediaViewer
        blob={mockBlob}
        filename="verified_doc.png"
        title="Asset Provenance Image"
      />
    );

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

    // Image rendered with secure blob src
    const img = screen.getByRole("img", { name: /asset provenance image/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "blob:http://localhost/test-uuid-1234");

    // Ensure raw blob URL is NOT exposed as visible text to user
    expect(screen.queryByText("blob:http://localhost/test-uuid-1234")).not.toBeInTheDocument();
    expect(screen.getByText(/decrypted in browser memory/i)).toBeInTheDocument();
  });

  it("renders protected video player with controlsList='nodownload' for video blobs", () => {
    const mockBlob = new Blob(["fake-video-bytes"], { type: "video/mp4" });

    const { container } = render(
      <SecureMediaViewer
        blob={mockBlob}
        filename="vault_recording.mp4"
      />
    );

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("src", "blob:http://localhost/test-uuid-1234");
    expect(video).toHaveAttribute("controlsList", "nodownload");
    expect(video).toHaveAttribute("disablePictureInPicture");
  });

  it("renders protected audio element for audio blobs", () => {
    const mockBlob = new Blob(["fake-audio-bytes"], { type: "audio/mp3" });

    const { container } = render(
      <SecureMediaViewer
        blob={mockBlob}
        filename="audio_proof.mp3"
      />
    );

    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute("src", "blob:http://localhost/test-uuid-1234");
    expect(audio).toHaveAttribute("controlsList", "nodownload");
  });

  it("revokes object URL on unmount to prevent memory leaks", () => {
    const mockBlob = new Blob(["test"], { type: "image/jpeg" });
    const { unmount } = render(<SecureMediaViewer blob={mockBlob} />);

    expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();

    unmount();

    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/test-uuid-1234");
  });

  it("revokes previous object URL when blob changes", () => {
    const mockBlob1 = new Blob(["test1"], { type: "image/jpeg" });
    const mockBlob2 = new Blob(["test2"], { type: "image/jpeg" });

    (window.URL.createObjectURL as jest.Mock)
      .mockReturnValueOnce("blob:http://localhost/1111")
      .mockReturnValueOnce("blob:http://localhost/2222");

    const { rerender } = render(<SecureMediaViewer blob={mockBlob1} />);
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob1);

    rerender(<SecureMediaViewer blob={mockBlob2} />);

    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/1111");
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob2);
  });

  it("prevents context menu (right-click) to protect media", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" });
    const { getByTestId } = render(<SecureMediaViewer blob={mockBlob} />);

    const viewer = getByTestId("secure-media-viewer");
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    const defaultPrevented = !viewer.dispatchEvent(event);

    expect(defaultPrevented).toBe(true);
  });

  it("displays loading state gracefully", () => {
    render(<SecureMediaViewer isLoading={true} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/rendering decrypted media.../i)).toBeInTheDocument();
  });

  it("displays error state gracefully", () => {
    render(<SecureMediaViewer error="Failed to decrypt ciphertext payload" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/failed to decrypt ciphertext payload/i)).toBeInTheDocument();
  });

  it("displays subtle security watermark protection", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" });
    render(
      <SecureMediaViewer
        blob={mockBlob}
        watermarkText="CUSTOM CONFIDENTIAL WATERMARK"
      />
    );

    expect(screen.getByText("CUSTOM CONFIDENTIAL WATERMARK")).toBeInTheDocument();
  });

  it("renders zoom controls for images and updates scale", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" });
    render(<SecureMediaViewer blob={mockBlob} filename="diagram.png" />);

    const zoomIn = screen.getByRole("button", { name: /zoom in/i });
    const img = screen.getByRole("img");

    fireEvent.click(zoomIn);
    expect(img).toHaveStyle("transform: scale(1.25)");

    const zoomOut = screen.getByRole("button", { name: /zoom out/i });
    fireEvent.click(zoomOut);
    expect(img).toHaveStyle("transform: scale(1)");
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<SecureMediaViewer onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: /close viewer/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import UploadProgress from "../UploadProgress";

describe("UploadProgress", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<UploadProgress label="photo.png" status="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reflects the upload percentage", () => {
    render(<UploadProgress label="photo.png" status="uploading" progress={42} />);
    const bar = screen.getByRole("progressbar", { name: "photo.png upload progress" });
    expect(bar).toHaveAttribute("value", "42");
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("Uploading…")).toBeInTheDocument();
  });

  it.each([
    [-10, "0"],
    [150, "100"],
    [33.6, "34"],
    [Number.NaN, "0"],
  ])("normalizes progress %p to %s", (progress, expected) => {
    render(<UploadProgress label="photo.png" status="uploading" progress={progress} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", expected);
  });

  it("shows a generating state with a full bar", () => {
    render(<UploadProgress label="manifest.json" status="generating" progress={60} />);
    expect(screen.getByText("Generating CID…")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
  });

  it("shows the success state with the generated CID", () => {
    const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    render(<UploadProgress label="photo.png" status="success" progress={80} cid={cid} />);
    expect(screen.getByText("CID generated")).toBeInTheDocument();
    expect(screen.getByTestId("upload-progress-cid")).toHaveTextContent(cid);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
    expect(screen.queryByText("80%")).not.toBeInTheDocument();
  });

  it("shows the error message and keeps the last progress", () => {
    render(
      <UploadProgress label="photo.png" status="error" progress={70} error="Storage configuration error." />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Storage configuration error.");
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "70");
  });

  it("falls back to a default error message", () => {
    render(<UploadProgress label="photo.png" status="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Upload failed");
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Accordion from "@/components/ui/Accordion";

describe("Accordion", () => {
  it("calls onToggle when header button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();

    render(
      <Accordion open={false} onToggle={onToggle} header={<div>My Header</div>}>
        <div>Content</div>
      </Accordion>,
    );

    const btn = screen.getByRole("button", { name: /My Header/i });
    expect(btn).toBeInTheDocument();

    await user.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders content when open", () => {
    render(
      <Accordion open={true} onToggle={() => {}} header={<div>My Header</div>}>
        <div>Content</div>
      </Accordion>,
    );

    expect(screen.getByText(/Content/i)).toBeInTheDocument();
  });
});

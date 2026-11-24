import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "./Pagination";

test("supports keyboard navigation with an unknown total", async () => {
  const user = userEvent.setup();
  const onPage = jest.fn();
  const { rerender } = render(<Pagination page={1} hasNext onPage={onPage} />);
  expect(screen.getByText("Page 1")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  await user.tab();
  expect(screen.getByRole("button", { name: "Next page" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onPage).toHaveBeenLastCalledWith(2);

  rerender(<Pagination page={2} totalPages={2} hasNext onPage={onPage} />);
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Previous page" }));
  expect(onPage).toHaveBeenLastCalledWith(1);
});

test.each([
  { page: 2, isLoading: true, hasNext: true },
  { page: 1, isLoading: false, hasNext: false, totalPages: 1 },
])("disables both controls for loading or an empty first page: %j", (props) => {
  render(<Pagination {...props} onPage={jest.fn()} />);
  expect(screen.getAllByRole("button")).toHaveLength(2);
  for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
});

test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid current page %s", async (page) => {
    const onPage = jest.fn();
    render(<Pagination page={page} hasNext onPage={onPage} />);
    expect(screen.getByText("Page unavailable")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(onPage).not.toHaveBeenCalled();
  },
);

test.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 1])(
  "disables navigation on page 2 with invalid or exceeded total %s", (totalPages) => {
    render(<Pagination page={2} totalPages={totalPages} hasNext onPage={jest.fn()} />);
    expect(screen.getByText("Page unavailable")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  },
);

test("disables Next at the safe integer boundary and on an empty result", () => {
  const onPage = jest.fn();
  const { rerender } = render(<Pagination page={Number.MAX_SAFE_INTEGER} hasNext onPage={onPage} />);
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();

  rerender(<Pagination page={1} totalPages={0} hasNext onPage={onPage} />);
  expect(screen.getByText("No pages")).toBeInTheDocument();
  for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
});

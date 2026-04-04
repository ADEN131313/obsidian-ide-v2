import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Editor } from "./Editor";

describe("Editor", () => {
  it("renders textarea", () => {
    render(<Editor content="test" onChange={() => {}} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("test");
  });

  it("calls onChange on input", () => {
    const mockOnChange = vi.fn();
    render(<Editor content="" onChange={mockOnChange} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "new content" } });
    expect(mockOnChange).toHaveBeenCalledWith("new content");
  });
});

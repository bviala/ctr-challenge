import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the scheduled label", () => {
    render(<StatusBadge status="scheduled" />);

    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("renders the completed label", () => {
    render(<StatusBadge status="completed" />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders the cancelled label", () => {
    render(<StatusBadge status="cancelled" />);

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

describe("Table", () => {
  it("renders the container wrapper and slot metadata", () => {
    render(
      <Table className="custom-table">
        <TableCaption>Scores</TableCaption>
        <TableHeader>
          <TableRow disableHover>
            <TableHead>Unit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Barbarian</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow disableHover>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("data-slot", "table");
    expect(table).toHaveClass("custom-table");
    expect(table.parentElement).toHaveAttribute("data-slot", "table-container");
    expect(screen.getByText("Scores")).toHaveAttribute("data-slot", "table-caption");
    expect(screen.getByRole("columnheader", { name: "Unit" })).toHaveAttribute(
      "data-slot",
      "table-head",
    );
    expect(screen.getByRole("cell", { name: "Barbarian" })).toHaveAttribute(
      "data-slot",
      "table-cell",
    );
  });

  it("omits hover styles when disableHover is true", () => {
    render(
      <Table>
        <TableBody>
          <TableRow disableHover>
            <TableCell>No hover</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Hover</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("row", { name: "No hover" }).className).not.toContain(
      "hover:bg-muted/50",
    );
    expect(screen.getByRole("row", { name: "Hover" }).className).toContain("hover:bg-muted/50");
  });
});

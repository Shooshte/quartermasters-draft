import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

describe("Tabs", () => {
  it("switches content and keeps variant metadata", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="effects">
        <TabsList variant="banner">
          <TabsTrigger value="effects">Effects</TabsTrigger>
          <TabsTrigger value="spells">Spells</TabsTrigger>
        </TabsList>
        <TabsContent value="effects">Effects content</TabsContent>
        <TabsContent value="spells">Spells content</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText("Effects content")).toBeVisible();
    expect(screen.queryByText("Spells content")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "banner");

    await user.click(screen.getByRole("tab", { name: "Spells" }));
    expect(screen.getByText("Spells content")).toBeVisible();
    expect(screen.queryByText("Effects content")).not.toBeInTheDocument();
  });
});

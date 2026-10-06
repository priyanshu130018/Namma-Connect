import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";

describe("UI Primitives", () => {
  it("renders Input with label, description and error", () => {
    const { rerender } = render(
      <Input label="Email" description="Enter your personal email" required />
    );
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText("Enter your personal email")).toBeInTheDocument();

    rerender(<Input label="Email" error="Invalid email address" />);
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
  });

  it("renders Card with header and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Estate Card</CardTitle>
        </CardHeader>
        <CardContent>Plantation overview</CardContent>
      </Card>
    );
    expect(screen.getByText("Estate Card")).toBeInTheDocument();
    expect(screen.getByText("Plantation overview")).toBeInTheDocument();
  });

  it("renders Badge with variants and dot", () => {
    render(<Badge variant="default" dot>Verified</Badge>);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("renders EmptyState component", () => {
    render(
      <EmptyState
        title="No Stays Found"
        description="Try adjusting your filter search criteria."
      />
    );
    expect(screen.getByText("No Stays Found")).toBeInTheDocument();
  });

  it("renders ErrorState component", () => {
    render(
      <ErrorState
        title="Failed to Load"
        description="Could not connect to service."
      />
    );
    expect(screen.getByText("Failed to Load")).toBeInTheDocument();
  });

  it("renders Spinner component", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders Tooltip on hover", () => {
    render(
      <Tooltip content="Tooltip Content">
        <button>Hover Me</button>
      </Tooltip>
    );
    const btn = screen.getByRole("button", { name: /hover me/i });
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Tooltip Content");
  });

  it("renders Dropdown and opens on click", () => {
    const onItemClick = vi.fn();
    render(
      <Dropdown trigger={<button>Open Menu</button>}>
        <DropdownItem onClick={onItemClick}>Menu Action</DropdownItem>
      </Dropdown>
    );
    const trigger = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(trigger);
    expect(screen.getByText("Menu Action")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Menu Action"));
    expect(onItemClick).toHaveBeenCalled();
  });

  it("renders Tabs and switches content", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Content 1")).toBeInTheDocument();
    expect(screen.queryByText("Content 2")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tab 2/i }));
    expect(screen.getByText("Content 2")).toBeInTheDocument();
  });

  it("renders Switch and toggles on click", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} label="Toggle Me" />);
    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders Select with options", () => {
    render(
      <Select
        label="Categories"
        options={[
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ]}
      />
    );
    expect(screen.getByLabelText(/Categories/i)).toBeInTheDocument();
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });
});

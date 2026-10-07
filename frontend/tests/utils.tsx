import React, { ReactElement } from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, MemoryRouterProps } from "react-router-dom";
import { ToastProvider } from "@/components/ui/toast";

export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: MemoryRouterProps["initialEntries"];
}

export function AllProviders({ children, initialEntries }: { children: React.ReactNode; initialEntries?: MemoryRouterProps["initialEntries"] }) {
  if (initialEntries) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <ToastProvider>{children}</ToastProvider>
      </MemoryRouter>
    );
  }
  return (
    <BrowserRouter>
      <ToastProvider>{children}</ToastProvider>
    </BrowserRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { initialEntries, ...renderOptions } = options || {};
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

export * from "@testing-library/react";
export { renderWithProviders as render };

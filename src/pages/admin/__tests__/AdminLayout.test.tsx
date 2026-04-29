import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "../AdminLayout";
import * as authHook from "@/hooks/use-auth";

function renderAt(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/login" element={<div>LOGIN_PAGE</div>} />
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<div>ADMIN_HOME</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function mockAuth(value: Partial<ReturnType<typeof authHook.useAuth>>) {
  vi.spyOn(authHook, "useAuth").mockReturnValue({
    session: null,
    user: null,
    isAdmin: false,
    loading: false,
    signOut: vi.fn(async () => {}),
    ...value,
  } as ReturnType<typeof authHook.useAuth>);
}

describe("AdminLayout access control", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows loading state while auth resolves", () => {
    mockAuth({ loading: true });
    renderAt();
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it("redirects to /admin/login when there is no session", () => {
    mockAuth({ session: null, isAdmin: false, loading: false });
    renderAt();
    expect(screen.getByText("LOGIN_PAGE")).toBeInTheDocument();
  });

  it("blocks signed-in users without admin role with a permission error", () => {
    mockAuth({
      session: { user: { id: "u1" } } as never,
      isAdmin: false,
      loading: false,
    });
    renderAt();
    expect(screen.getByText(/Sem permissão/i)).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_HOME")).not.toBeInTheDocument();
  });

  it("allows admins to render the admin outlet", () => {
    mockAuth({
      session: { user: { id: "admin1" } } as never,
      isAdmin: true,
      loading: false,
    });
    renderAt();
    expect(screen.getByText("ADMIN_HOME")).toBeInTheDocument();
    expect(screen.queryByText(/Sem permissão/i)).not.toBeInTheDocument();
  });
});
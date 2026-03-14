"use client";

import { createContext, useContext, useState } from "react";
import type { Organization } from "@/types/organization.types";

interface WorkspaceContextValue {
  organizations: Organization[];
  selectedOrgId: string | null; // null = individual
  setSelectedOrgId: (id: string | null) => void;
  selectedOrg: Organization | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  organizations: [],
  selectedOrgId: null,
  setSelectedOrgId: () => {},
  selectedOrg: null,
});

export function WorkspaceProvider({
  organizations,
  children,
}: {
  organizations: Organization[];
  children: React.ReactNode;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    organizations.length > 0 ? organizations[0].id : null
  );

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{ organizations, selectedOrgId, setSelectedOrgId, selectedOrg }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

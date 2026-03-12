import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      addWorkspace: (workspace) =>
        set((state) => ({ workspaces: [...state.workspaces, workspace] })),
    }),
    {
      name: 'workspace-storage',
    }
  )
);

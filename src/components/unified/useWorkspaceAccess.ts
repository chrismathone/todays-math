"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WORKSPACE_MENUS,
  normalizeWorkspaceMenus,
  type AccountAccess,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import type { WorkspaceIdentity } from "./WorkspaceAccount";

const ALL_MENUS = WORKSPACE_MENUS.map((menu) => menu.id);
export const ACCESS_REFRESH_MS = 30_000;

/** Refresh the access snapshot without replacing the user-scoped draft owner. */
export function useWorkspaceAccess(
  currentUser: WorkspaceIdentity | undefined,
  allowedMenus: WorkspaceMenu[] | undefined,
  storageScope: string | undefined,
) {
  const router = useRouter();
  const source = JSON.stringify([currentUser, allowedMenus, storageScope]);
  const [snapshot, setSnapshot] = useState<{
    source: string;
    user: WorkspaceIdentity;
    menus: WorkspaceMenu[];
  }>();
  const authenticated = Boolean(currentUser);

  useEffect(() => {
    if (!authenticated) return;
    let disposed = false;
    let inFlight: AbortController | undefined;
    let lastStarted = -Infinity;

    async function refresh() {
      if (disposed || inFlight || Date.now() - lastStarted < 1000) return;
      lastStarted = Date.now();
      const controller = new AbortController();
      inFlight = controller;
      // Bound a stalled request so later focus/interval checks can recover.
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      const deny = (path: string) => {
        const user = JSON.parse(source)[0] as WorkspaceIdentity;
        setSnapshot({
          source,
          user: {
            ...user,
            isAdmin: false,
            isSuperAdmin: false,
            canManageClasses: false,
          },
          menus: [],
        });
        router.replace(path);
      };
      try {
        const response = await fetch("/api/account/access", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (disposed || controller.signal.aborted) return;
        if (response.status === 401) return deny("/login");
        if (response.status === 403) return deny("/approval-pending");
        if (!response.ok) return;
        const body = (await response.json()) as { data?: AccountAccess };
        if (disposed || controller.signal.aborted || !body.data) return;
        const access = body.data;
        // A different browser session must reload under its own draft scope.
        if (storageScope && access.id !== storageScope) return deny("/login");
        if (access.approvalStatus !== "approved")
          return deny("/approval-pending");
        if (!Array.isArray(access.menus)) return;
        if (
          access.role === "reviewer" &&
          !access.isAdmin &&
          access.menus.includes("bank")
        )
          return deny("/review");
        const menus = normalizeWorkspaceMenus(access.menus).filter(
          (menu) =>
            ALL_MENUS.some((item) => item === menu) &&
            (access.isAdmin || access.role !== "reviewer"),
        );
        const user = {
          branchId: access.branchId ?? null,
          name: access.name,
          email: access.email,
          isAdmin: access.isAdmin === true,
          isSuperAdmin: access.isSuperAdmin === true,
          canManageClasses: access.menus.includes("teaching"),
        };
        setSnapshot((previous) =>
          previous?.source === source &&
          JSON.stringify([previous.user, previous.menus]) ===
            JSON.stringify([user, menus])
            ? previous
            : { source, user, menus },
        );
      } catch {
        // A transient network failure leaves the last verified UI intact.
        // Server authorization still applies to every feature request.
      } finally {
        window.clearTimeout(timeout);
        if (inFlight === controller) inFlight = undefined;
      }
    }
    const onFocus = () => void refresh();
    const onAccessChange = () => {
      inFlight?.abort();
      inFlight = undefined;
      lastStarted = -Infinity;
      void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const interval = window.setInterval(onFocus, ACCESS_REFRESH_MS);
    window.addEventListener("focus", onFocus);
    window.addEventListener("workspace-access-change", onAccessChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      inFlight?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("workspace-access-change", onAccessChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authenticated, router, source, storageScope]);

  return snapshot?.source === source
    ? { currentUser: snapshot.user, allowedMenus: snapshot.menus }
    : {
        currentUser,
        allowedMenus: normalizeWorkspaceMenus(allowedMenus ?? ALL_MENUS),
      };
}

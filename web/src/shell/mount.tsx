import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/base.css";
import { AccountProvider } from "./account";
import { Layout } from "./Layout";
import type { PageKey } from "./links";

/** Entry point shared by every page: base styles, account context and the site shell. */
export function mount(current: PageKey, page: ReactNode) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AccountProvider>
        <Layout current={current}>{page}</Layout>
      </AccountProvider>
    </StrictMode>,
  );
}

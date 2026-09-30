import { Tabs, type TabDef } from "../../components/Tabs";
import { replaceUrl, useHashTab } from "../../lib/url";
import { BlueprintsPanel } from "./BlueprintsPanel";
import { CommunityPanel } from "./CommunityPanel";
import "./builds.css";

type Tab = "blueprints" | "community";
const TABS: TabDef<Tab>[] = [
  { id: "blueprints", label: "Signature Blueprints" },
  { id: "community", label: "Community Builds" },
];

export function BuildsPage() {
  const [tab, setTab] = useHashTab<Tab>(["blueprints", "community"], "blueprints", () => {
    document.querySelector(".pagehead .tabs")?.scrollIntoView({ block: "start" });
  });
  const select = (t: Tab) => {
    setTab(t);
    replaceUrl(new URLSearchParams(), t);
  };
  return (
    <>
      <div className="wrap">
        <div className="crumb"><a href="/">Home</a> / Builds</div>
        <div className="pagehead">
          <div className="eyebrow">Builds</div>
          <h1>NBA 2K27 Builds</h1>
          <p>Start from one of 2K&rsquo;s official Signature Blueprints, or see what the 2KLab community has built. Any build opens in the MyPlayer Builder.</p>
          <Tabs tabs={TABS} selected={tab} onSelect={select} label="Build source" />
        </div>
      </div>
      <main className="wrap">
        <section className="panel" id="panel-blueprints" role="tabpanel" aria-labelledby="tab-blueprints" hidden={tab !== "blueprints"}>
          <BlueprintsPanel />
        </section>
        <section className="panel" id="panel-community" role="tabpanel" aria-labelledby="tab-community" hidden={tab !== "community"}>
          <CommunityPanel />
        </section>
      </main>
    </>
  );
}

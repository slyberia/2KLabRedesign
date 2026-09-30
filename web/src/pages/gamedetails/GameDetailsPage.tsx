import { Tabs, type TabDef } from "../../components/Tabs";
import { initialParams, replaceUrl, useHashTab } from "../../lib/url";
import { ControlsPanel, FacePanel, HowToPanel, SettingsPanel, TvPanel, VcPanel } from "./GuidePanels";
import { RewardsPanel } from "./RewardsPanel";
import "./gamedetails.css";

type Tab = "settings" | "controls" | "guides" | "vc-prices" | "face-creations" | "2ktv" | "rewards";
const TABS: TabDef<Tab>[] = [
  { id: "settings", label: "Best Settings", tabId: "tab-set", panelId: "panel-set" },
  { id: "controls", label: "Controls", tabId: "tab-ctrl", panelId: "panel-ctrl" },
  { id: "guides", label: "How-To Guides", tabId: "tab-howto", panelId: "panel-howto" },
  { id: "vc-prices", label: "VC Prices", tabId: "tab-vc", panelId: "panel-vc" },
  { id: "face-creations", label: "Face Creations", tabId: "tab-face", panelId: "panel-face" },
  { id: "2ktv", label: "2KTV Answers", tabId: "tab-tv", panelId: "panel-tv" },
  { id: "rewards", label: "Rewards", tabId: "tab-rewards", panelId: "panel-rewards" },
];

export function GameDetailsPage() {
  // ?track= implies the Rewards tab even without the #rewards hash.
  const [tab, setTab] = useHashTab<Tab>(TABS.map((t) => t.id), initialParams().has("track") ? "rewards" : "settings", () => {
    document.querySelector(".pagehead .tabs")?.scrollIntoView({ block: "start" });
  });
  const select = (t: Tab) => {
    setTab(t);
    // ?track= only means something on the Rewards tab
    replaceUrl(t === "rewards" ? new URLSearchParams(location.search) : new URLSearchParams(), t);
  };
  const panel = (t: Tab) => {
    const d = TABS.find((x) => x.id === t)!;
    return { className: "panel", id: d.panelId, role: "tabpanel", "aria-labelledby": d.tabId, hidden: tab !== t };
  };
  return (
    <>
      <div className="wrap">
        <div className="crumb"><a href="/">Home</a> / Game Details</div>
        <div className="pagehead">
          <div className="eyebrow">Game Details</div>
          <h1>NBA 2K27 Game Details</h1>
          <p>
            Set up your game and look up the essentials: best settings, controls, VC prices, face creations, this week&rsquo;s 2KTV
            answers, and every reward track. Attributes now live on <a href="/mycareer#attributes">MyCareer</a>.
          </p>
          <Tabs tabs={TABS} selected={tab} onSelect={select} label="Section" />
        </div>
      </div>
      <div className="wrap">
        <div {...panel("settings")}><SettingsPanel /></div>
        <div {...panel("controls")}><ControlsPanel /></div>
        <div {...panel("guides")}><HowToPanel /></div>
        <div {...panel("vc-prices")}><VcPanel /></div>
        <div {...panel("face-creations")}><FacePanel /></div>
        <div {...panel("2ktv")}><TvPanel /></div>
        <div {...panel("rewards")}><RewardsPanel /></div>
      </div>
    </>
  );
}

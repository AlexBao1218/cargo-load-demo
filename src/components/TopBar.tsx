import ScenarioSwitch from "@/components/ScenarioSwitch";

interface Props {
  onHelp: () => void;
}

export default function TopBar({ onHelp }: Props) {
  return (
    <header className="bg-surface">
      <div className="mx-auto flex h-11 w-full max-w-5xl items-center gap-4 px-3 md:h-12 md:px-6">
        <div className="flex min-w-0 items-baseline gap-x-2">
          <h1 className="text-[15px] font-semibold leading-tight whitespace-nowrap">Boeing 747-8F</h1>
          <span className="text-xs whitespace-nowrap text-muted">ULD load planner</span>
        </div>
        <ScenarioSwitch className="ml-auto hidden w-[360px] md:grid" />
        <button
          type="button"
          onClick={onHelp}
          className="ml-auto flex h-8 items-center rounded-md border border-line bg-surface px-2.5 text-[13px] text-ink transition-colors duration-150 hover:border-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade md:ml-0"
        >
          How it works
        </button>
      </div>
    </header>
  );
}

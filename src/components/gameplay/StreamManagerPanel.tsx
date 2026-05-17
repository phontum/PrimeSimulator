import { ActivityFeedPanel } from "./ActivityFeedPanel";
import { useGameplayStore } from "../../state/gameplayStore";

export function StreamManagerPanel(): JSX.Element {
  const { ruleSet, day } = useGameplayStore();

  return (
    <section className="stream-manager-panel min-w-0 flex-1 p-6">
      <h2 className="text-lg font-bold text-[#efeff1]">Менеджер стрима</h2>
      <div className="mt-4 grid max-w-5xl grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-md border border-[#2f2f35] bg-[#18181b] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-[#adadb8]">День {day}</p>
              <h3 className="text-base font-bold text-white">{ruleSet?.title ?? "Правила загружаются..."}</h3>
            </div>
          </div>
          <div className="mt-4 max-h-[calc(100vh-11rem)] overflow-y-auto pr-2">
            {(ruleSet?.rules ?? []).map((rule, index) => (
              <div key={rule.id} className="border-t border-[#2f2f35] py-2 first:border-t-0">
                <p className="text-sm font-semibold text-[#efeff1]">{index + 1}. {rule.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#adadb8]">{rule.description}</p>
              </div>
            ))}
            {ruleSet && ruleSet.rules.length === 0 ? (
              <p className="text-sm text-[#adadb8]">На этот день правила пока не заполнены.</p>
            ) : null}
          </div>
        </div>
        <ActivityFeedPanel />
      </div>
    </section>
  );
}

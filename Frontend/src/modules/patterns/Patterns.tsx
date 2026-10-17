import { useSearchParams } from "react-router-dom";
import { Seg } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import FacadePanel from "./FacadePanel";
import FlyweightPanel from "./FlyweightPanel";

type Pattern = "facade" | "flyweight";

export default function Patterns() {
  const [params, setParams] = useSearchParams();
  const active: Pattern = params.get("patron") === "flyweight" ? "flyweight" : "facade";

  return (
    <Page
      title="Patrones"
      service="api-gateway · products-service"
      subtitle="Mira con datos reales qué cambia al aplicar cada patrón"
    >
      <Seg
        label="Patrón de diseño"
        value={active}
        onChange={(key) => setParams(key === "facade" ? {} : { patron: key })}
        items={[
          { key: "facade", label: "Facade" },
          { key: "flyweight", label: "Flyweight" },
        ]}
      />
      {active === "facade" ? <FacadePanel /> : <FlyweightPanel />}
    </Page>
  );
}

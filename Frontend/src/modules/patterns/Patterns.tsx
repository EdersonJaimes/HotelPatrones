import { useSearchParams } from "react-router-dom";
import { Seg } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import BrokerPanel from "./BrokerPanel";
import FacadePanel from "./FacadePanel";
import FlyweightPanel from "./FlyweightPanel";
import FlyweightRamPanel from "./FlyweightRamPanel";

type Pattern = "facade" | "broker";

export default function Patterns() {
  const [params, setParams] = useSearchParams();
  const active: Pattern = params.get("patron") === "broker" ? "broker" : "facade";

  return (
    <Page
      title="Patrones"
      service="api-gateway · RabbitMQ · reservations-service · products-service"
      subtitle="Mira con datos reales qué cambia al aplicar cada patrón"
    >
      <Seg
        label="Patrón de diseño"
        value={active}
        onChange={(key) => setParams(key === "facade" ? {} : { patron: key })}
        items={[
          { key: "facade", label: "Facade · API Gateway y Flyweight" },
          { key: "broker", label: "Facade · Broker" },
        ]}
      />
      {active === "facade" && (
        <div className="stack">
          <FacadePanel />
          <FlyweightRamPanel />
          <FlyweightPanel />
        </div>
      )}
      {active === "broker" && <BrokerPanel />}
    </Page>
  );
}

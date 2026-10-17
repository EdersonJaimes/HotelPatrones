import { useSearchParams } from "react-router-dom";
import { Seg } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import BrokerPanel from "./BrokerPanel";
import FacadePanel from "./FacadePanel";
import FlyweightPanel from "./FlyweightPanel";

type Pattern = "facade" | "broker" | "flyweight";

export default function Patterns() {
  const [params, setParams] = useSearchParams();
  const param = params.get("patron");
  const active: Pattern = param === "flyweight" || param === "broker" ? param : "facade";

  return (
    <Page
      title="Patrones"
      service="api-gateway · RabbitMQ · products-service"
      subtitle="Mira con datos reales qué cambia al aplicar cada patrón"
    >
      <Seg
        label="Patrón de diseño"
        value={active}
        onChange={(key) => setParams(key === "facade" ? {} : { patron: key })}
        items={[
          { key: "facade", label: "Facade · API Gateway" },
          { key: "broker", label: "Facade · Broker" },
          { key: "flyweight", label: "Flyweight" },
        ]}
      />
      {active === "facade" && <FacadePanel />}
      {active === "broker" && <BrokerPanel />}
      {active === "flyweight" && <FlyweightPanel />}
    </Page>
  );
}

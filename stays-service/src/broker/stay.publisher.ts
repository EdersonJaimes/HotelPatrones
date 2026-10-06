import { broker } from "./broker.facade";

interface StayEventData {
  stayId: string;
  roomId: string;
  roomNumber: number;
}

export async function publishStayStarted(data: StayEventData): Promise<void> {
  broker.publish("stay.started", "STAY_STARTED", data);
}

export async function publishStayProductAdded(
  data: StayEventData & { productId: string; quantity: number }
): Promise<void> {
  broker.publish("stay.product_added", "STAY_PRODUCT_ADDED", data);
}

export async function publishStayCheckedOut(
  data: StayEventData & { hours: number; roomTotal: number; productsTotal: number; total: number }
): Promise<void> {
  broker.publish("stay.checked_out", "STAY_CHECKED_OUT", data);
}

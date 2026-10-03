import { broker } from "./broker.facade";
import { UserRole } from "../models/user.model";

interface UserEventData {
  userId: string;
  username: string;
  role: UserRole;
}

export async function publishUserLoggedIn(data: UserEventData): Promise<void> {
  broker.publish("auth.user.logged_in", "USER_LOGGED_IN", data);
}

export async function publishUserCreated(data: UserEventData): Promise<void> {
  broker.publish("auth.user.created", "USER_CREATED", data);
}

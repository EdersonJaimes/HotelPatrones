import { getRabbitChannel } from "./rabbitmq";
import { UserRole } from "../models/user.model";

interface UserLoggedInEvent {
  userId: string;
  username: string;
  role: UserRole;
}

export async function publishUserLoggedIn(data: UserLoggedInEvent): Promise<void> {
  const channel = getRabbitChannel();
  const exchange = process.env.RABBITMQ_EXCHANGE as string;

  const message = {
    event: "USER_LOGGED_IN",
    timestamp: new Date().toISOString(),
    data
  };

  channel.publish(
    exchange,
    "auth.user.logged_in",
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true,
      contentType: "application/json"
    }
  );

  console.log("[AUTH][Broker] Evento publicado: auth.user.logged_in");
}

export async function publishUserCreated(data: {
  userId: string;
  username: string;
  role: UserRole;
}): Promise<void> {
  const channel = getRabbitChannel();
  const exchange = process.env.RABBITMQ_EXCHANGE as string;

  const message = {
    event: "USER_CREATED",
    timestamp: new Date().toISOString(),
    data
  };

  channel.publish(
    exchange,
    "auth.user.created",
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true,
      contentType: "application/json"
    }
  );

  console.log("[AUTH][Broker] Evento publicado: auth.user.created");
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { publishUserCreated, publishUserLoggedIn } from "../broker/auth.publisher";
import { UserRepository } from "../repositories/user.repository";
import { UserRole } from "../models/user.model";

export class AuthService {
  private readonly userRepository = new UserRepository();

  async login(username: string, password: string) {
    const user = await this.userRepository.findByUsername(username);

    if (!user || !user.active) {
      throw new Error("Credenciales inválidas");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new Error("Credenciales inválidas");
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET no está configurada");
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        role: user.role
      },
      secret,
      {
        expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"]
      }
    );

    await publishUserLoggedIn({
      userId: user._id.toString(),
      username: user.username,
      role: user.role
    });

    return {
      token,
      role: user.role,
      name: user.name,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    };
  }

  async createUser(data: {
    username: string;
    name: string;
    password: string;
    role: UserRole;
  }) {
    const exists = await this.userRepository.existsByUsername(data.username);

    if (exists) {
      throw new Error("El usuario ya existe");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword
    });

    await publishUserCreated({
      userId: user._id.toString(),
      username: user.username,
      role: user.role
    });

    return {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role
    };
  }

  async listUsers() {
    const users = await this.userRepository.findAll();

    return users.map((user) => ({
      _id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      active: user.active
    }));
  }

  async updateUser(
    id: string,
    data: { name?: string; password?: string; role?: UserRole; active?: boolean }
  ) {
    const updateData: { name?: string; password?: string; role?: UserRole; active?: boolean } = {
      ...data
    };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    const user = await this.userRepository.updateById(id, updateData);

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    return {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      active: user.active
    };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.deleteById(id);

    if (!user) {
      throw new Error("Usuario no encontrado");
    }
  }

  async ensureInitialAdmin(): Promise<void> {
    const count = await this.userRepository.count();

    if (count > 0) {
      return;
    }

    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const name = process.env.ADMIN_NAME || "Administrador";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      username,
      name,
      password: hashedPassword,
      role: "admin"
    });

    await publishUserCreated({
      userId: user._id.toString(),
      username: user.username,
      role: user.role
    });

    console.log(`[AUTH] Usuario administrador inicial creado: ${username}`);
  }
}

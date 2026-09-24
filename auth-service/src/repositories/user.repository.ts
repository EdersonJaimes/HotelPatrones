import { IUser, User, UserRole } from "../models/user.model";

export interface CreateUserData {
  username: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserData {
  name?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
}

export class UserRepository {
  async findAll(): Promise<IUser[]> {
    return User.find().sort({ username: 1 });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username }).select("+password");
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return Boolean(await User.exists({ username }));
  }

  async create(data: CreateUserData): Promise<IUser> {
    return User.create(data);
  }

  async updateById(id: string, data: UpdateUserData): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
  }

  async deleteById(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id);
  }

  async count(): Promise<number> {
    return User.countDocuments();
  }
}

import User, { IUser } from "../models/user.model";

export interface CreateUserDto {
  name: string;
  email: string;
  hashedPassword: string;
  loginedCount?: number;
}

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByIdWithPassword(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(data: CreateUserDto): Promise<IUser>;
  updateById(id: string, data: Partial<IUser>): Promise<void>;
  deleteById(id: string): Promise<IUser | null>;
  findAll(): Promise<IUser[]>;
  findPaginated(skip: number, limit: number): Promise<[IUser[], number]>;
}

class UserRepository implements IUserRepository {
  findById(id: string) {
    return User.findById(id).select("-hashedPassword");
  }

  findByIdWithPassword(id: string) {
    return User.findById(id);
  }

  findByEmail(email: string) {
    return User.findOne({ email });
  }

  create(data: CreateUserDto) {
    const user = new User({ ...data, loginedCount: data.loginedCount ?? 1 });
    return user.save();
  }

  async updateById(id: string, data: Partial<IUser>) {
    await User.updateOne({ _id: id }, { $set: data });
  }

  deleteById(id: string) {
    return User.findByIdAndDelete(id);
  }

  findAll() {
    return User.find().select("-hashedPassword");
  }

  findPaginated(skip: number, limit: number): Promise<[IUser[], number]> {
    return Promise.all([
      User.find().skip(skip).limit(limit).select("-hashedPassword"),
      User.countDocuments(),
    ]);
  }
}

export const userRepository = new UserRepository();

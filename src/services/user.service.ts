import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repository";
import { tokenService } from "./token.service";
import { clearCachePattern } from "../middlewares/cache.middleware";

export const userService = {
  async getAllUsers() {
    return userRepository.findAll();
  },

  async getUsersByPage(page: number, size: number) {
    const skip = (page - 1) * size;
    const [users, elements] = await userRepository.findPaginated(skip, size);
    const totalPages = Math.ceil(elements / size) || 1;
    return { data: users, elements, totalPages, page, size };
  },

  async updateCredentials(id: string, name: string, email: string) {
    const user = await userRepository.findById(id);
    if (!user) return { notFound: true } as const;

    await userRepository.updateById(id, { name, email } as never);
    await clearCachePattern("cache:/api/users*");
    const updated = await userRepository.findById(id);
    return { user: updated } as const;
  },

  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) return { notFound: true } as const;

    await userRepository.deleteById(id);
    await tokenService.revokeAllUserTokens(id);
    await clearCachePattern("cache:/api/users*");
    return { name: user.name } as const;
  },

  async toggleBlock(id: string, isBlocked: boolean) {
    const user = await userRepository.findById(id);
    if (!user) return { notFound: true } as const;
    if (user.isBlocked === isBlocked) return { unchanged: true, user } as const;

    await userRepository.updateById(id, { isBlocked } as never);
    if (isBlocked) await tokenService.revokeAllUserTokens(id);
    await clearCachePattern("cache:/api/users*");
    return { user, isBlocked } as const;
  },

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await userRepository.findByIdWithPassword(id);
    if (!user) return { notFound: true } as const;

    const isMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!isMatch) return { wrongPassword: true } as const;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updateById(id, { hashedPassword } as never);
    return { ok: true } as const;
  },
};

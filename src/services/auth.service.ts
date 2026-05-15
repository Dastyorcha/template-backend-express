import bcrypt from "bcrypt";
import sendEmail from "../utils/send-email";
import { verificationCodeEmail, passwordResetEmail } from "../utils/email-templates";
import { userRepository } from "../repositories/user.repository";
import { codeStoreService } from "./code-store.service";
import { tokenService } from "./token.service";

function generateCode(): string {
  return (Math.floor(Math.random() * 900000) + 100000).toString();
}

export const authService = {
  async register(name: string, email: string, password: string) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return { conflict: true } as const;
    }

    const code = generateCode();
    await codeStoreService.setVerificationCode(email, code, { email, name, password });
    await sendEmail({ to: email, subject: "Verify your email", html: verificationCodeEmail(code) });
    return { sent: true } as const;
  },

  async verifyRegistration(email: string, code: string) {
    const record = await codeStoreService.getVerificationCode(email);
    if (!record) return { notFound: true } as const;
    if (record.code !== code) return { invalid: true } as const;

    const { name, password } = record.userDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.create({ name, email, hashedPassword, loginedCount: 1 });
    await codeStoreService.deleteVerificationCode(email);

    const { accessToken, refreshToken } = tokenService.generateTokenPair(String(user._id));
    await tokenService.storeRefreshToken(String(user._id), refreshToken);

    return { user, accessToken, refreshToken } as const;
  },

  async resendCode(email: string) {
    const record = await codeStoreService.getVerificationCode(email);
    if (!record) return { notFound: true } as const;

    const code = generateCode();
    await codeStoreService.setVerificationCode(email, code, record.userDto);
    await sendEmail({ to: email, subject: "Verify your email", html: verificationCodeEmail(code) });
    return { sent: true } as const;
  },

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return { notFound: true } as const;
    if (user.isBlocked) return { blocked: true } as const;

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) return { wrongPassword: true } as const;

    await userRepository.updateById(String(user._id), {
      loginedCount: user.loginedCount + 1,
    } as never);

    const { accessToken, refreshToken } = tokenService.generateTokenPair(String(user._id));
    await tokenService.storeRefreshToken(String(user._id), refreshToken);

    return { user, accessToken, refreshToken } as const;
  },

  async refreshTokens(oldRefreshToken: string) {
    const userId = await tokenService.validateRefreshToken(oldRefreshToken);
    if (!userId) return { invalid: true } as const;

    await tokenService.revokeRefreshToken(userId, oldRefreshToken);
    const { accessToken, refreshToken } = tokenService.generateTokenPair(userId);
    await tokenService.storeRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken } as const;
  },

  async logout(refreshToken: string) {
    const userId = await tokenService.validateRefreshToken(refreshToken);
    if (userId) await tokenService.revokeRefreshToken(userId, refreshToken);
  },

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return { notFound: true } as const;

    const code = generateCode();
    await codeStoreService.setResetCode(email, code, String(user._id));
    await sendEmail({ to: email, subject: "Reset your password", html: passwordResetEmail(code) });
    return { sent: true } as const;
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const record = await codeStoreService.getResetCode(email);
    if (!record) return { notFound: true } as const;
    if (record.code !== code) return { invalid: true } as const;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updateById(record.userId, { hashedPassword } as never);
    await codeStoreService.deleteResetCode(email);

    return { ok: true } as const;
  },
};

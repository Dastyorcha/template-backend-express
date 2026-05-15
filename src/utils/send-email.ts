import nodemailer from "nodemailer";
import { env } from "../config/env";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: parseInt(env.EMAIL_PORT, 10),
    secure: env.EMAIL_PORT === "465",
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
};

export default sendEmail;

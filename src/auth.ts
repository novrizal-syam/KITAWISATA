import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalisePhone, verifyOtp } from "@/lib/otp";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role?: Role;
    phone?: string;
  }
  interface Session {
    user: { id: string; role: Role; phone: string; name?: string | null };
  }
}

const otpInput = z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Credentials providers require JWT sessions in Auth.js.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "phone-otp",
      name: "Nomor HP",
      credentials: { phone: {}, code: {} },
      async authorize(raw) {
        const parsed = otpInput.safeParse(raw);
        if (!parsed.success) return null;
        const phone = normalisePhone(parsed.data.phone);
        if (!phone || !(await verifyOtp(phone, parsed.data.code))) return null;
        // First login on the consumer site creates a TRAVELLER account.
        // Business-portal users are provisioned by their Finance Admin / seed data.
        const user = await db.user.upsert({ where: { phone }, update: {}, create: { phone } });
        return { id: user.id, name: user.name, role: user.role, phone: user.phone };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.phone = user.phone;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as Role;
      session.user.phone = token.phone as string;
      return session;
    },
  },
});

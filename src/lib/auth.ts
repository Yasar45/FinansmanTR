import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth, { type AuthOptions, type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '@/lib/env';
import { KycStatus } from '@prisma/client';

export type Role = 'USER' | 'MOD' | 'ADMIN';
export type Ability = 'manage:pricing' | 'manage:listings' | 'manage:users';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: Role;
      abilities: Ability[];
      locale: string;
      kycStatus: KycStatus;
    };
  }

  interface User {
    role: Role;
    abilities: Ability[];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Şifre', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email }
        });
        if (!user || !user.passwordHash) {
          return null;
        }
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          return null;
        }
        return user;
      }
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID ?? 'stub',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? 'stub'
    })
  ],
  session: {
    strategy: 'database'
  },
  callbacks: {
    async session({ session, user }) {
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id }
      });
      session.user = {
        ...session.user,
        id: user.id,
        role: (user.role as Role) ?? 'USER',
        abilities: (user.abilities as Ability[]) ?? [],
        locale: profile?.preferredLocale ?? 'tr-TR',
        kycStatus: profile?.kycStatus ?? KycStatus.UNVERIFIED
      };
      return session;
    }
  },
  pages: {
    signIn: '/auth/sign-in'
  }
};

export const {
  handlers: { GET: authHandlerGet, POST: authHandlerPost },
  auth,
  signIn,
  signOut
} = NextAuth(authOptions);

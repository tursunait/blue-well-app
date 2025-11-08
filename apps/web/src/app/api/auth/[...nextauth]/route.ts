import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { isDevMode, getMockSession } from "@/lib/auth-dev";

// In dev mode, use a credentials provider that always succeeds
// In production, use Google OAuth
const providers = isDevMode()
  ? [
      CredentialsProvider({
        name: "Development",
        credentials: {},
        async authorize() {
          const mockSession = await getMockSession();
          if (mockSession) {
            return {
              id: mockSession.user.id,
              email: mockSession.user.email,
              name: mockSession.user.name,
            };
          }
          return null;
        },
      }),
    ]
  : [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: "openid email profile https://www.googleapis.com/auth/calendar",
          },
        },
      }),
    ];

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      // In dev mode, use mock session
      if (isDevMode()) {
        const mockSession = await getMockSession();
        if (mockSession) {
          token.id = mockSession.user.id;
        }
        return token;
      }

      if (user) {
        token.id = user.id;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // In dev mode, return mock session
      if (isDevMode()) {
        const mockSession = await getMockSession();
        if (mockSession) {
          return mockSession as any;
        }
      }

      if (session.user && token.id) {
        session.user.id = token.id as string;
        // Ensure Profile and Integration exist
        try {
          await prisma.profile.upsert({
            where: { userId: token.id as string },
            create: { userId: token.id as string },
            update: {},
          });
          await prisma.integration.upsert({
            where: { userId: token.id as string },
            create: { userId: token.id as string },
            update: {},
          });
        } catch (error) {
          console.error("Error ensuring user records:", error);
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" && account.access_token && user.id) {
        // Store Google token for calendar access
        try {
          await prisma.integration.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              gcalConnected: true,
              gcalToken: account.access_token, // In production, encrypt this
            },
            update: {
              gcalConnected: true,
              gcalToken: account.access_token,
            },
          });
        } catch (error) {
          console.error("Error storing integration:", error);
        }
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/welcome",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

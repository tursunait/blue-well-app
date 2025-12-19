import { NextAuthOptions } from "next-auth";
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

      // On sign in, add the user ID
      if (user) {
        token.id = user.id;
      }

      // If Google returns an access token, store it
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (!account) return true; // Allow credentials provider

      // For OAuth, ensure user exists in database
      if (user?.email) {
        try {
          const dbUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
              email: user.email,
              name: user.name || undefined,
            },
          });

          // If Google connected, store the integration
          if (account.provider === "google" && account.access_token) {
            try {
              await prisma.integration.upsert({
                where: { userId: dbUser.id },
                create: {
                  userId: dbUser.id,
                  gcalConnected: true,
                  gcalToken: account.access_token,
                },
                update: {
                  gcalConnected: true,
                  gcalToken: account.access_token,
                },
              });
            } catch (e) {
              console.warn("Failed to store integration:", e);
            }
          }
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

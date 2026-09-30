import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { verifyTurnstileToken } from '@/lib/turnstile';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          username: profile.name,
          role: 'user',
        };
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        turnstileToken: { label: 'Turnstile', type: 'text' },
      },
      async authorize(credentials) {
        const identifier = credentials?.username as string;
        const password = credentials?.password as string;
        const turnstileToken = credentials?.turnstileToken as string;

        if (!identifier || !password) return null;

        // Verify turnstile token if passed
        if (turnstileToken) {
          const isHuman = await verifyTurnstileToken(turnstileToken);
          if (!isHuman) {
            console.warn('Turnstile verification failed for login attempt');
            return null;
          }
        }

        try {
          const client = await clientPromise;
          const dbName = process.env.MONGODB_DB_NAME || 'captainmedia';
          const db = client.db(dbName);
          const usersCol = db.collection('users');

          const trimmed = identifier.trim();
          const isEmail = trimmed.includes('@');
          const query = isEmail
            ? { email: trimmed.toLowerCase() }
            : { username: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } };

          const user = await usersCol.findOne(query);

          if (!user || !user.password) return null;
          if (user.isActive === false) return null;

          const isValid = await bcrypt.compare(password, user.password as string);
          if (!isValid) return null;

          return {
            id: user._id.toString(),
            email: user.email as string,
            name: (user.name || user.username) as string,
            image: (user.avatar as string) || null,
            role: (user.role as string) || 'user',
          };
        } catch (error) {
          console.error('Credentials auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user?.email) {
        try {
          const client = await clientPromise;
          const dbName = process.env.MONGODB_DB_NAME || 'captainmedia';
          const db = client.db(dbName);
          const usersCol = db.collection('users');

          const email = user.email.toLowerCase();
          const existing = await usersCol.findOne({ email });

          if (!existing) {
            const rawUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
            const username = rawUsername || `user_${Date.now()}`;
            await usersCol.insertOne({
              name: user.name || username,
              username,
              email,
              avatar: user.image || null,
              role: 'user',
              isActive: true,
              authProvider: 'google',
              linh_thach: 0,
              rank: 'Phàm Nhân',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            await usersCol.updateOne(
              { email },
              {
                $set: {
                  name: existing.name || user.name,
                  avatar: existing.avatar || user.image || null,
                  updatedAt: new Date(),
                },
              }
            );
          }
        } catch (error) {
          console.error('Error handling Google signIn:', error);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // @ts-expect-error - role is custom field
        token.role = user.role || 'user';
      }
      // Nếu đăng nhập bằng Google, lấy role từ database
      if (account?.provider === 'google' && user?.email) {
        try {
          const client = await clientPromise;
          const dbName = process.env.MONGODB_DB_NAME || 'captainmedia';
          const db = client.db(dbName);
          const dbUser = await db.collection('users').findOne({ email: (user.email as string).toLowerCase() });
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role || 'user';
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;

        // Re-check elevated roles against Mongo on every session read. JWTs can
        // outlive an admin-role change, so trusting token.role alone would let
        // a demoted account keep accessing admin routes until token expiry.
        let role = token.role === 'admin' ? 'admin' : 'user';
        if (role === 'admin' && session.user.email) {
          try {
            const client = await clientPromise;
            const dbName = process.env.MONGODB_DB_NAME || 'captainmedia';
            const dbUser = await client
              .db(dbName)
              .collection('users')
              .findOne(
                { email: session.user.email.toLowerCase() },
                { projection: { role: 1, isActive: 1 } },
              );

            role = dbUser?.role === 'admin' && dbUser.isActive !== false ? 'admin' : 'user';
          } catch (error) {
            // Fail closed for elevated access if the role cannot be verified.
            console.error('Error refreshing user role:', error);
            role = 'user';
          }
        }

        // @ts-expect-error - role is custom field
        session.user.role = role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  cookies: {
    sessionToken: {
      name: `anime-session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});

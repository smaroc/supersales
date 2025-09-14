import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import User from "@/models/User"
import Organization from "@/models/Organization"
import dbConnect from "@/lib/mongodb"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          await dbConnect()
          
          // For demo purposes, create a default account if it doesn't exist
          let user = await User.findOne({ email: credentials.email }).populate('organizationId').lean()
          
          if (!user) {
            // Create default organization
            const defaultOrg = new Organization({
              name: "Acme Corporation",
              domain: "acme.com",
              industry: "Technology", 
              size: "medium",
              subscription: {
                plan: "professional",
                status: "active"
              },
              settings: {
                timezone: "UTC",
                currency: "USD",
                dateFormat: "MM/DD/YYYY",
                callRecording: true,
                autoAnalysis: true
              },
              callInsights: [
                {
                  name: "Budget Discussion",
                  description: "Keywords related to budget and pricing",
                  keywords: ["budget", "price", "cost", "expensive", "affordable"],
                  weightage: 8,
                  category: "opportunity"
                },
                {
                  name: "Decision Maker",
                  description: "Indicators of decision-making authority",
                  keywords: ["decide", "approve", "authority", "manager", "director"],
                  weightage: 9,
                  category: "positive"
                }
              ]
            })
            
            const savedOrg = await defaultOrg.save()

            // Create default user
            const newUser = new User({
              organizationId: savedOrg._id,
              email: credentials.email,
              firstName: "Demo",
              lastName: "User",
              role: "admin",
              isActive: true,
              preferences: {
                theme: "system",
                notifications: {
                  email: true,
                  inApp: true,
                  callSummaries: true,
                  weeklyReports: true
                },
                dashboard: {
                  defaultView: "overview",
                  refreshInterval: 300
                }
              }
            })

            user = await newUser.save()
            if (user) {
              user = await User.findById((user as any)._id).populate('organizationId').lean() || user
            }
          }

          // For demo, accept any password
          if (!user) return null
          
          return {
            id: (user as any)._id.toString(),
            email: (user as any).email,
            name: `${(user as any).firstName} ${(user as any).lastName}`,
            image: (user as any).avatar || null,
            organizationId: (user as any).organizationId?._id?.toString() || '',
            organizationName: (user as any).organizationId?.name || '',
            role: (user as any).role,
            permissions: (user as any).permissions,
            preferences: (user as any).preferences
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
        token.role = user.role
        token.permissions = user.permissions
        token.preferences = user.preferences
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.organizationId = token.organizationId as string
        session.user.organizationName = token.organizationName as string
        session.user.role = token.role as string
        session.user.permissions = token.permissions as any
        session.user.preferences = token.preferences as any
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  }
}
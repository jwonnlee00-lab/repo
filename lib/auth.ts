import {betterAuth} from 'better-auth/minimal';
import {drizzleAdapter} from '@better-auth/drizzle-adapter';
import {env} from 'cloudflare:workers';
import {getDb} from '../db';
import {authUser,authSession,authAccount,authVerification} from '../db/schema';
export function makeAuth(){const cfg=env as unknown as Record<string,string>;if(!cfg.BETTER_AUTH_SECRET)throw Error('Auth secret unavailable');return betterAuth({secret:cfg.BETTER_AUTH_SECRET,baseURL:cfg.BETTER_AUTH_URL,basePath:'/api/auth',database:drizzleAdapter(getDb(),{provider:'sqlite',schema:{user:authUser,session:authSession,account:authAccount,verification:authVerification}}),emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128},session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},advanced:{useSecureCookies:cfg.BETTER_AUTH_URL?.startsWith('https:')},logger:{disabled:true}})}

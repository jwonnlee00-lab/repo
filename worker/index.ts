import {makeAuth} from '../lib/auth';
import {runAsUser,authorizeApi} from '../lib/access';
import {migrationOperator} from '../lib/migration-operator';
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url=new URL(request.url),path=url.pathname;
    if(path==='/api/admin/migrate')return migrationOperator(request);
    if(path.startsWith('/api/auth/')){
      const allowed=['/api/auth/sign-up/email','/api/auth/sign-in/email','/api/auth/sign-out','/api/auth/get-session'];
      if(!allowed.includes(path))return new Response(null,{status:404});
      const auth=makeAuth();
      if(path==='/api/auth/get-session'){const session=await auth.api.getSession({headers:request.headers});return Response.json({user:session?.user?{id:session.user.id,email:session.user.email,name:session.user.name}:null},{headers:{'Cache-Control':'no-store'}})}
      const response=await auth.handler(request);const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
      if(path==='/api/auth/sign-in/email'&&!response.ok&&response.status!==429)return Response.json({error:'이메일 또는 비밀번호가 올바르지 않습니다.'},{status:401,headers});
      if(path==='/api/auth/sign-up/email'&&!response.ok)return Response.json({error:'가입 정보를 확인해 주세요. 이미 가입했다면 로그인해 주세요.'},{status:response.status,headers});
      if(response.ok){const body=await response.json() as any;return Response.json({ok:true,user:body.user?{id:body.user.id,email:body.user.email,name:body.user.name}:undefined},{status:response.status,headers})}
      return response;
    }
    const publicPath=path==='/login'||path==='/signup'||path.startsWith('/_next/')||path.startsWith('/assets/')||path.startsWith('/favicon');
    let session: Awaited<ReturnType<ReturnType<typeof makeAuth>["api"]["getSession"]>> = null;
    if(!publicPath){try{session=await makeAuth().api.getSession({headers:request.headers})}catch{return Response.json({error:'인증 서비스를 사용할 수 없습니다.'},{status:503})}
      if(!session)return path.startsWith('/api/')?Response.json({error:'로그인이 필요합니다.'},{status:401,headers:{'Cache-Control':'no-store'}}):new Response(null,{status:302,headers:{Location:'/login','Cache-Control':'no-store'}});
      if(path.startsWith('/api/')){const denied=await authorizeApi(request,session.user.id);if(denied)return denied}
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response=await runWithConnectorBinding(binding, () => session?runAsUser(session.user.id,()=>handler.fetch(request,env,ctx)):handler.fetch(request,env,ctx)); if(!publicPath){const headers=new Headers(response.headers);headers.set("Cache-Control","no-store");return new Response(response.body,{status:response.status,headers})}return response;
  },
};

export default worker;



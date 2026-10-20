import {AsyncLocalStorage} from 'node:async_hooks';
import {getDb} from '../db';
import {entries,tasks} from '../db/schema';
import {and,eq} from 'drizzle-orm';
const users=new AsyncLocalStorage<string>();
export const runAsUser=<T>(id:string,fn:()=>T)=>users.run(id,fn);
export function currentUserId(){const id=users.getStore();if(!id)throw Error('Unauthenticated request');return id}
export async function authorizeApi(r:Request,userId:string){const db=getDb(),u=new URL(r.url),p=u.pathname;let b:any={};if(r.method!=='GET'){try{b=await r.clone().json()}catch{return Response.json({error:'입력 형식이 올바르지 않습니다.'},{status:400})}}
const ownPlan=async(id:string)=>!!id&&!!await db.select({id:entries.id}).from(entries).where(and(eq(entries.id,id),eq(entries.ownerId,userId))).get();
const ownTask=async(id:string)=>!!id&&!!await db.select({id:tasks.id}).from(tasks).innerJoin(entries,eq(tasks.planId,entries.id)).where(and(eq(tasks.id,id),eq(entries.ownerId,userId))).get();
let allowed=false;
if(p==='/api/entries'){const id=r.method==='GET'?u.searchParams.get('history'):b.id;allowed=!id||await ownPlan(id);if(allowed&&b.parent)allowed=await ownPlan(b.parent)}
else if(p==='/api/tasks'){const plan=r.method==='GET'?u.searchParams.get('planId'):b.planId;if(r.method==='DELETE')allowed=await ownTask(b.id);else{allowed=await ownPlan(plan);if(allowed&&b.id){const task=await db.select().from(tasks).where(eq(tasks.id,b.id)).get();allowed=!!task&&task.planId===b.planId}}}
else if(p==='/api/executions')allowed=await ownTask(r.method==='GET'?u.searchParams.get('taskId'):b.taskId);
else if(p==='/api/complete')allowed=await ownTask(b.taskId);
else if(p==='/api/carryover')allowed=await ownPlan(b.sourcePlanId);
else if(p==='/api/review'){const id=u.searchParams.get('planId');allowed=!id||await ownPlan(id)}
else if(p==='/api/export')allowed=r.method==='GET';
return allowed?null:Response.json({error:'자료를 찾을 수 없습니다.'},{status:404});}

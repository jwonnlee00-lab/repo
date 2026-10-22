import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.AUTH_TEST_URL||'http://127.0.0.1:8787',password=randomBytes(32).toString('base64url');const checks=[];
async function call(path,{method='GET',body,cookie}={}){const r=await fetch(base+path,{method,headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await r.text();assert.ok(!text.includes(password));return {status:r.status,body:text?JSON.parse(text):null,cookie:r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')}}
function status(label,r,n){assert.equal(r.status,n,JSON.stringify({label,status:r.status,body:r.body}));checks.push({label,status:r.status});}
async function account(label){const s=await call('/api/auth/sign-up/email',{method:'POST',body:{name:'실행 수정 검증 '+label,email:`edit-${label}-${Date.now()}@pds.invalid`,password}});status('signup '+label,s,200);const cookie=s.cookie;const p=await call('/api/entries',{method:'POST',cookie,body:{id:'',date:'2026-10-22',startDate:'2026-10-20',endDate:'2026-10-24',priority:'normal',success:'실행 수정 검증',version:0,title:'실행 수정 QA '+label,planned:60,actual:null,done:'',review:'',next:'',parent:''}});status('plan '+label,p,200);const t=await call('/api/tasks',{method:'POST',cookie,body:{id:'',planId:p.body.id,title:'수정 시험',dueDate:'2026-10-22',priority:'normal',tags:['검증'],estimated:60,completed:false,version:0}});status('task '+label,t,200);return {cookie,task:t.body,plan:p.body}}
const A=await account('A'),B=await account('B');
async function create(a,start,end){const r=await call('/api/executions',{method:'POST',cookie:a.cookie,body:{requestKey:randomUUID(),taskId:a.task.id,startedAt:start,endedAt:end,blocked:'검증',note:'검증용 실행'}});status('create log',r,200);return r.body}
const first=await create(A,'2026-10-20T10:00:00+09:00','2026-10-20T10:30:00+09:00');
const second=await create(A,'2026-10-21T00:00:00+09:00','2026-10-21T00:01:00+09:00');
const previous=l=>({startedAt:l.startedAt,endedAt:l.endedAt,blocked:l.blocked,note:l.note});
const body={id:first.id,taskId:A.task.id,previous:previous(first),startedAt:'2026-10-21T10:00:00+09:00',endedAt:'2026-10-21T10:45:00+09:00',blocked:'수정 이유',note:'수정한 내용'};

status('foreign task edit',await call('/api/executions',{method:'POST',body,cookie:B.cookie}),404);
status('own task with foreign log id',await call('/api/executions',{method:'POST',body:{...body,taskId:B.task.id},cookie:B.cookie}),404);
const changed=await call('/api/executions',{method:'POST',body,cookie:A.cookie});status('edit date and duration',changed,200);assert.equal(changed.body.id,first.id);assert.equal(changed.body.createdAt,first.createdAt);assert.equal(changed.body.minutes,45);assert.equal(changed.body.startedAt,'2026-10-21T01:00:00.000Z');
status('stale overwrite rejected',await call('/api/executions',{method:'POST',body,cookie:A.cookie}),409);
status('duplicate time rejected',await call('/api/executions',{method:'POST',body:{...body,previous:previous(changed.body),startedAt:second.startedAt,endedAt:second.endedAt},cookie:A.cookie}),409);
status('end before start',await call('/api/executions',{method:'POST',body:{...body,previous:previous(changed.body),endedAt:'2026-10-21T09:00:00+09:00'},cookie:A.cookie}),400);
const zeroBody={id:second.id,taskId:A.task.id,previous:previous(second),startedAt:'2026-10-21T00:00:00+09:00',endedAt:'2026-10-21T00:00:00+09:00',blocked:'다른 포스팅을 진행함',note:'미실행',notExecuted:true};
const zero=await call('/api/executions',{method:'POST',body:zeroBody,cookie:A.cookie});status('correct to zero minutes',zero,200);assert.equal(zero.body.minutes,0);assert.equal(zero.body.id,second.id);
status('zero without explicit flag',await call('/api/executions',{method:'POST',body:{...zeroBody,previous:previous(zero.body),notExecuted:false},cookie:A.cookie}),400);
const logs=await call('/api/executions?taskId='+A.task.id,{cookie:A.cookie});assert.equal(logs.body.length,2);assert.equal(logs.body.reduce((n,l)=>n+l.minutes,0),45);
const tasks=await call('/api/tasks?planId='+A.plan.id,{cookie:A.cookie});assert.deepEqual(tasks.body[0],A.task);
const review=await call('/api/review?planId='+A.plan.id,{cookie:A.cookie});status('review after edit',review,200);assert.equal(review.body.summary.actual,45);assert.equal(review.body.summary.estimated,60);assert.equal(review.body.summary.completed,0);
const exported=await call('/api/export',{cookie:A.cookie});assert.equal(exported.body.data.executions.length,2);assert.equal(exported.body.data.completions.length,0);
const foreign=await call('/api/executions?taskId='+B.task.id,{cookie:B.cookie});assert.deepEqual(foreign.body,[]);
for(const a of [A,B])await call('/api/auth/sign-out',{method:'POST',cookie:a.cookie,body:{}});
status('anonymous edit',await call('/api/executions',{method:'POST',body}),401);
mkdirSync('outputs/evidence/task07',{recursive:true});writeFileSync('outputs/evidence/task07/execution-edit-tests.json',JSON.stringify({checkedAt:new Date().toISOString(),base,checks,idAndCreatedAtPreserved:true,logCount:2,taskUnchanged:true,review:{estimated:60,actual:45,completed:0},password:'[not recorded]',cookies:'[not recorded]'},null,2));console.log('PASS: execution date/duration edit, 0-minute correction, same IDs/count, stale and duplicate 409, ownership 404, anonymous 401, unchanged plan/task/completion, refreshed review/export.');

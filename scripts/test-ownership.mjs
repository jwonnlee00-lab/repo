import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.AUTH_TEST_URL||'http://127.0.0.1:8787';
const password=randomBytes(32).toString('base64url');
const checks=[];
async function call(path,{method='GET',body,cookie,headers={}}={}){
 const response=await fetch(base+path,{method,redirect:'manual',headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const text=await response.text();assert.ok(!text.includes(password));
 return {status:response.status,body:text?JSON.parse(text):null};
}
function record(label,path,options,response){checks.push({label,request:{method:options.method||'GET',url:base+path,headers:{Origin:base,...(options.cookie?{Cookie:'[actor session redacted]'}:{}),...(options.headers||{})},...(options.body?{body:options.body}:{})},response});}
async function signup(label){
 const r=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:`카드4 검증 ${label}`,email:`ownership-${label}-${Date.now()}@pds.invalid`,password})});
 assert.equal(r.status,200);const data=await r.json();
 return {label,id:data.user.id,cookie:r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '),plans:[],tasks:[]};
}
const A=await signup('A'),B=await signup('B');
const planInput=title=>({id:'',date:'2026-10-20',startDate:'2026-10-20',endDate:'2026-10-20',priority:'normal',success:'계정별 자료 격리 확인',version:0,title,planned:30,actual:null,done:'',review:'',next:'',parent:''});
for(const user of [A,B])for(let n=1;n<=2;n++){
 const p=await call('/api/entries',{method:'POST',cookie:user.cookie,body:planInput(`카드4 ${user.label} 검증 계획 ${n}`)});assert.equal(p.status,200);assert.equal(p.body.ownerId,user.id);user.plans.push(p.body);
 const t=await call('/api/tasks',{method:'POST',cookie:user.cookie,body:{id:'',planId:p.body.id,title:`카드4 ${user.label} 검증 할 일 ${n}`,dueDate:'2026-10-20',priority:'normal',tags:['접근검증'],estimated:10,completed:false,version:0}});assert.equal(t.status,200);user.tasks.push(t.body);
}
async function snapshot(user){const r=await call('/api/export',{cookie:user.cookie});assert.equal(r.status,200);return r.body.data;}
function counts(data){return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length]));}
const seed={A:{userId:A.id,planIds:A.plans.map(p=>p.id),taskIds:A.tasks.map(t=>t.id),counts:counts(await snapshot(A))},B:{userId:B.id,planIds:B.plans.map(p=>p.id),taskIds:B.tasks.map(t=>t.id),counts:counts(await snapshot(B))}};
for(const [actor,victim] of [[A,B],[B,A]]){
 const original=await snapshot(victim),p=victim.plans[0],t=victim.tasks[0];
 const attempts=[
  ['/api/entries?history='+p.id,{}],
  ['/api/entries',{method:'POST',body:{...p,title:'다른 계정의 수정 시도'}}],
  ['/api/entries',{method:'DELETE',body:{id:p.id}}],
  ['/api/tasks?planId='+p.id,{}],
  ['/api/tasks',{method:'POST',body:{...t,title:'다른 계정의 할 일 수정 시도'}}],
  ['/api/tasks',{method:'DELETE',body:{id:t.id,version:t.version}}],
  ['/api/tasks',{method:'POST',body:{...t,planId:actor.plans[0].id,title:'남의 할 일을 내 계획으로 이동 시도'}}],
  ['/api/tasks',{method:'POST',body:{...t,id:'',title:'다른 계정 계획에 새 할 일 생성 시도'}}]
 ];
 for(const [path,input] of attempts){const options={...input,cookie:actor.cookie};const r=await call(path,options);assert.equal(r.status,404);assert.deepEqual(r.body,{error:'자료를 찾을 수 없습니다.'});record(`${actor.label} -> ${victim.label}`,path,options,r);assert.deepEqual(await snapshot(victim),original);}
 checks.push({label:`${actor.label} -> ${victim.label} before/after`,before:counts(original),after:counts(await snapshot(victim)),allSixTablesUnchanged:true,newForeignRows:0});
}
// Supply the victim identity in a URL, headers, and a GET body independently.
for(const [actor,victim] of [[A,B],[B,A]]){
 const list=await call('/api/entries',{cookie:actor.cookie});assert.equal(list.status,200);assert.equal(list.body.length,2);assert.ok(list.body.every(p=>p.ownerId===actor.id));
 record(`${actor.label} list isolation`,'/api/entries',{cookie:actor.cookie},list);
 const path=`/api/entries?ownerId=${victim.id}&userId=${victim.id}&owner_id=${victim.id}`;
 const headers={'X-User-Id':victim.id,'X-Owner-Id':victim.id};
 const forged=await call(path,{cookie:actor.cookie,headers});assert.equal(forged.status,200);assert.deepEqual(forged.body,list.body);record(`${actor.label} URL/header forgery`,path,{cookie:actor.cookie,headers},forged);
 // Fetch disallows GET bodies; use Node's HTTPS client to exercise this server boundary.
 const {request}=await import('node:https');
 const body={ownerId:victim.id,userId:victim.id,owner_id:victim.id};const json=JSON.stringify(body);
 const bodyResult=await new Promise((resolve,reject)=>{const req=request(base+'/api/entries',{method:'GET',headers:{Origin:base,Cookie:actor.cookie,'Content-Type':'application/json','Content-Length':Buffer.byteLength(json)}},res=>{let data='';res.on('data',v=>data+=v);res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(data)})}catch(e){reject(e)}})});req.on('error',reject);req.end(json)});
 assert.equal(bodyResult.status,200);assert.deepEqual(bodyResult.body,list.body);record(`${actor.label} GET body forgery`,'/api/entries',{cookie:actor.cookie,body},bodyResult);
 const original=await snapshot(victim);
 const options={method:'POST',cookie:actor.cookie,body:{...planInput(`카드4 ${actor.label} 소유자 위조 입력`),ownerId:victim.id,userId:victim.id,owner_id:victim.id},headers};
 const created=await call('/api/entries',options);assert.equal(created.status,200);assert.equal(created.body.ownerId,actor.id);record(`${actor.label} POST body owner forgery`,'/api/entries',options,created);assert.deepEqual(await snapshot(victim),original);
 const ownExport=await snapshot(actor);assert.ok(ownExport.entries.every(p=>p.ownerId===actor.id));const ownIds=new Set(ownExport.entries.map(p=>p.id));assert.ok(ownExport.tasks.every(t=>ownIds.has(t.planId)));assert.ok(!ownExport.entries.some(p=>victim.plans.some(q=>q.id===p.id)));
 checks.push({label:`${actor.label} forged creation effect`,victimBefore:counts(original),victimAfter:counts(await snapshot(victim)),victimAllFieldsUnchanged:true,createdOwnerIsActor:true,exportHasNoForeignPlansOrTasks:true});
}
for(const path of ['/api/entries','/api/tasks?planId='+A.plans[0].id,'/api/export']){const r=await call(path);assert.equal(r.status,401);assert.deepEqual(r.body,{error:'로그인이 필요합니다.'});record('anonymous',path,{},r);}
for(const user of [A,B]){const r=await call('/api/auth/sign-out',{method:'POST',cookie:user.cookie,body:{}});assert.equal(r.status,200);}
const evidence={checkedAt:new Date().toISOString(),scope:base,password:'[not recorded]',cookies:'[not recorded]',seed,checks,limitations:'Disposable QA accounts only; request headers and cookies in evidence are redacted. No real user records modified.'};
const serialized=JSON.stringify(evidence,null,2);assert.ok(!serialized.includes(password));for(const user of [A,B])for(const c of user.cookie.split('; '))assert.ok(!serialized.includes(c));
mkdirSync('outputs/evidence/task07',{recursive:true});writeFileSync('outputs/evidence/task07/card4-ownership.json',serialized);
console.log('PASS: bidirectional plan/task read, update, delete and foreign creation rejected; all victim tables unchanged; forged identity ignored; isolated lists/export; anonymous 401.');

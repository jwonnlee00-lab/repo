import assert from 'node:assert/strict';
const url='http://127.0.0.1:8787';
const request=async(path,v,method='POST')=>{const r=await fetch(url+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});return {status:r.status,data:await r.json()}};
const plan=(await request('/api/entries',{id:'',date:'2026-10-20',startDate:'2026-10-20',endDate:'2026-10-31',priority:'normal',success:'검증용',version:0,title:'검증 전용 계획',planned:30,actual:null,done:'',review:'',next:'',parent:''})).data;
const base={id:'',planId:plan.id,title:'검증용 할 일',dueDate:'2026-10-21',priority:'normal',tags:['검증'],estimated:10,completed:false,version:0};
const list=async(params={})=>(await fetch(url+'/api/tasks?'+new URLSearchParams({planId:plan.id,...params}))).json();
try{
 for(const patch of [{dueDate:'2026-02-30'},{estimated:-1},{priority:'urgent'},{tags:[]}])assert.equal((await request('/api/tasks',{...base,...patch})).status,400);
 const items=[];for(let i=0;i<5;i++){const r=await request('/api/tasks',{...base,title:`검증용 ${i}`,priority:i===1?'high':i===2?'low':'normal',estimated:i===4?null:10-i,tags:[i===0?'생활':'검증']});assert.equal(r.status,200);items.push(r.data)}
 let r=await request('/api/tasks',{...items[0],title:'수정된 할 일'});assert.equal(r.status,200);let edited=r.data;
 assert.equal((await request('/api/tasks',{...items[0],title:'오래된 수정'})).status,409);
 r=await request('/api/tasks',{...edited,completed:true});assert.equal(r.status,200);edited=r.data;assert.equal((await list({status:'done'})).length,1);assert.equal((await list({status:'active'})).length,4);
 r=await request('/api/tasks',{...edited,completed:false});assert.equal(r.status,200);assert.equal((await list({status:'done'})).length,0);assert.equal((await list({status:'active'})).length,5);
 assert.equal((await list({q:'수정된'})).length,1);assert.equal((await list({q:'생활'})).length,1);assert.equal((await list({tag:'생활'})).length,1);assert.equal((await list({priority:'high'})).length,1);assert.equal((await list({q:"' OR 1=1 --"})).length,0);
 assert.equal((await list({sort:'priority'}))[0].priority,'high');const estimates=await list({sort:'estimated'});assert.equal(estimates.at(-1).estimated,null);assert.ok(estimates.slice(0,-1).every((t,i,a)=>i===0||a[i-1].estimated<=t.estimated));
 const due=await list({sort:'due'});assert.deepEqual(due.map(x=>x.id),(await list({sort:'due'})).map(x=>x.id));assert.deepEqual(due.map(x=>x.id),[...due].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)).map(x=>x.id));
 assert.equal((await request('/api/tasks',{id:items[4].id,version:items[4].version},'DELETE')).status,200);assert.equal((await list()).length,4);
 console.log('PASS T06-C09~C20: create five, edit, complete, undo, delete, metadata, search, filters, stable ordering, unspecified duration last');
}finally{await request('/api/entries',{id:plan.id},'DELETE')}

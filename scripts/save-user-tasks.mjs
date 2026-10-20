const url=process.env.DIARY_URL||'http://127.0.0.1:8787';
async function post(path,value){const r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw Error(await r.text());return r.json()}
const plans=await(await fetch(url+'/api/entries')).json();let plan=plans.find(p=>p.title==='10월 생활·학습 일정');if(!plan)plan=await post('/api/entries',{id:'',date:'2026-10-21',startDate:'2026-10-21',endDate:'2026-10-31',priority:'normal',success:'등록한 생활·학습 할 일을 각각 완료하고 실행 여부를 기록하기',version:0,title:'10월 생활·학습 일정',planned:372,actual:null,done:'',review:'',next:'',parent:''});
if(plan.planned===252)plan=await post('/api/entries',{...plan,planned:372});
const current=await(await fetch(url+'/api/tasks?planId='+plan.id)).json();
const items=[['분리수거 하기','2026-10-21','low',10,'생활'],['월세 내기','2026-10-21','high',2,'납부'],['팀프로젝트','2026-10-25','normal',240,'팀프로젝트'],['SKT ALEPH 견학','2026-10-31','high',null,'견학'],['겨울 옷 꺼내기','2026-10-24','normal',120,'생활']];
for(const [title,dueDate,priority,estimated,tag]of items){if(current.some(t=>t.title===title))continue;await post('/api/tasks',{id:'',planId:plan.id,title,dueDate,priority,estimated,tags:[tag],completed:false,version:0})}
console.log('사용자 제공 실제 할 일 저장 완료:',(await(await fetch(url+'/api/tasks?planId='+plan.id)).json()).length,'건');


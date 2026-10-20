const url=process.env.DIARY_URL||'http://127.0.0.1:8787';
const post=async(v)=>{const r=await fetch(url+'/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});if(!r.ok)throw Error(await r.text());return r.json()};
const rows=await(await fetch(url+'/api/entries')).json();
for(const date of ['2026-10-19','2026-10-20']){const existing=rows.find(x=>x.date===date&&x.title.includes('팟캐스트'));if(existing?.success)continue;
let saved=await post({...existing,id:existing?.id||'',date,startDate:date,endDate:date,priority:'normal',success:'팟캐스트 한 편을 끝까지 시청하기',version:existing?.version||0,title:existing?.title||'팟캐스트 하나 다 보기',planned:30,actual:date==='2026-10-19'?0:null,done:date==='2026-10-19'?'안했다':'',review:date==='2026-10-19'?'집에서 보려니 하기가 싫더라. 점심시간에 봐야 할 거 같다.':'',next:date==='2026-10-19'?'2026-10-20 점심시간에 팟캐스트 하나 다 보기':'',parent:date==='2026-10-20'?(rows.find(x=>x.date==='2026-10-19')?.id||''):''});
if(date==='2026-10-20')await post({...saved,title:'점심시간에 팟캐스트 하나 다 보기'});
}
console.log('사용자 제공 팟캐스트 기록을 저장하고 재조회했습니다. 우선순위는 보통, 기간은 당일, 성공 기준은 한 편 끝까지 시청으로 설정했습니다.');

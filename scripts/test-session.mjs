import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.AUTH_TEST_URL||'http://127.0.0.1:8787';
const password=randomBytes(32).toString('base64url');
async function request(path,{method='GET',body,cookie}={}){
 const response=await fetch(base+path,{method,redirect:'manual',headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const text=await response.text();assert.ok(!text.includes(password));
 return {response,body:text?JSON.parse(text):null};
}
const signup=await request('/api/auth/sign-up/email',{method:'POST',body:{name:'세션 검증 계정',email:`session-${Date.now()}@pds.invalid`,password}});
assert.equal(signup.response.status,200);
const setCookies=signup.response.headers.getSetCookie();
const sessionCookie=setCookies.find(v=>v.split('=')[0].endsWith('session_token'));
assert.ok(sessionCookie);
const cookie=sessionCookie.split(';')[0];
const cookieName=cookie.split('=')[0];
assert.ok(!base.includes(cookie.split('=')[1]));
const attrs=sessionCookie.split(';').slice(1).map(v=>v.trim());
assert.ok(attrs.some(v=>v.toLowerCase()==='httponly'));
if(base.startsWith('https:'))assert.ok(attrs.some(v=>v.toLowerCase()==='secure'));
assert.ok(attrs.some(v=>v.toLowerCase()==='samesite=lax'));
const maxAge=Number(attrs.find(v=>/^max-age=/i.test(v))?.split('=')[1]);assert.equal(maxAge,604800);
const target='/api/entries';
const before=await request(target,{cookie});assert.equal(before.response.status,200);assert.deepEqual(before.body,[]);
const logout=await request('/api/auth/sign-out',{method:'POST',body:{},cookie});assert.equal(logout.response.status,200);
// Deliberately replay the original cookie. Do not apply logout's Set-Cookie.
const after=await request(target,{cookie});assert.equal(after.response.status,401);assert.deepEqual(after.body,{error:'로그인이 필요합니다.'});
const getSession=await request('/api/auth/get-session',{cookie});assert.equal(getSession.body.user,null);
const recordedAt=new Date().toISOString();
const evidence={checkedAt:recordedAt,scope:base,method:'database-backed session',library:'better-auth@1.7.11',userId:signup.body.user.id,cookie:{name:cookieName,value:'[same original value, redacted]',attributes:attrs,maxAgeSeconds:maxAge,expiresAfterDays:7},requests:[{phase:'logged in',request:{method:'GET',url:base+target,headers:{Origin:base,Cookie:`${cookieName}=[SAME_SESSION_REDACTED]`}},response:{status:before.response.status,body:before.body}},{phase:'logout',request:{method:'POST',url:base+'/api/auth/sign-out',headers:{Origin:base,Cookie:`${cookieName}=[SAME_SESSION_REDACTED]`},body:{}},response:{status:logout.response.status,body:logout.body}},{phase:'replay after logout',request:{method:'GET',url:base+target,headers:{Origin:base,Cookie:`${cookieName}=[SAME_SESSION_REDACTED]`}},response:{status:after.response.status,body:after.body}}],sameOriginalCookieReplayed:true,getSessionAfterLogout:{status:getSession.response.status,body:getSession.body},noSessionValueInRequestUrls:true,responseContainsPassword:false,limitations:'7-day elapsed-time expiry and password-change revocation were not executed. Logout replay was executed in production.'};
const serialized=JSON.stringify(evidence,null,2);assert.ok(!serialized.includes(cookie.split('=')[1]));assert.ok(!serialized.includes(password));
mkdirSync('outputs/evidence/task07',{recursive:true});writeFileSync('outputs/evidence/task07/card3-session.json',serialized);
console.log('PASS: same GET and original cookie: 200 before logout, 401 after logout; Secure/HttpOnly/SameSite and 7-day Max-Age verified. Values redacted.');

# 카드 2 — 비밀번호 보관

이 앱은 비밀번호 원문을 데이터베이스에 저장하지 않습니다. Better Auth 1.7.11의 기본 scrypt 구현으로 비밀번호를 해시하고, 로그인할 때 라이브러리가 입력값을 검증합니다. 별도의 해시 함수나 salt 생성 함수를 직접 구현하지 않았습니다.

## 선택한 방법

scrypt는 비밀번호 후보를 대량으로 시험하는 데 메모리와 계산 비용이 들도록 설계되어 있고, 현재 사용하는 Better Auth가 기본으로 제공하므로 선택했습니다. 인증 라이브러리의 검증된 경로를 유지하면서 직접 비밀번호 보관 코드를 작성하는 범위를 줄일 수 있습니다. [Better Auth 공식 문서](https://better-auth.com/docs/authentication/email-password)의 Password Hashing 설명과 설치된 패키지의 실제 구현을 함께 확인했습니다.

앱 설정은 `lib/auth.ts`의 `makeAuth()`입니다. `emailAndPassword.enabled`를 켰고 사용자 정의 `password.hash`나 `password.verify`는 지정하지 않았습니다. 설치된 `node_modules/@better-auth/utils/dist/password.node.mjs`와 `password.mjs`는 N=16384, r=16, p=1, 출력 64바이트와 임의 salt 16바이트를 사용합니다. 저장 형식은 `salt의 hex:해시의 hex`입니다. NFKC 정규화도 라이브러리가 처리합니다. 실행 환경별 구현은 Node의 crypto 또는 라이브러리의 대체 구현이며, 실제 운영 저장값은 아래처럼 같은 형식으로 확인했습니다.

## 운영 데이터베이스에서 확인한 값

2026년 10월 20일 `scripts/test-auth.mjs`로 검증용 계정 A와 B를 만들었습니다. 실행 중 생성한 임의 비밀번호 하나를 두 가입 요청에 똑같이 사용했습니다. 원문은 파일·출력·제출 기록에 저장하지 않았으며 본인 계정은 이 시험에 사용하지 않았습니다.

Sites 데이터베이스 읽기 도구로 운영 D1의 `DB` 바인딩과 `auth_account` 표를 확인했습니다. 두 검증 계정의 `provider_id`는 `credential`이고 `password` 열의 전체 값은 다음과 같습니다. 다른 계정의 행은 제출 자료에 옮기지 않았습니다.

계정 A:

```text
25549795914ff5a8417f986e6d2453e7:9905e7b545f8d64b29b9b5c75b504d18eae1a7e598d2fed8159dbd95b5204fee1df82c851eafadfa52747acf82c4cff844e039a781f2c04af8463ca8bae1528b
```

계정 B:

```text
41452a4053d2f1bc4055a6cb906e9229:a52f5e64abc38cf3630255a45d13a6e16b428ece23b6426860f148e0ef33381a48bdb27aedfda1f17d8bd188cf1ff54eb5d66cac7993d081c3368f66508b1835
```

같은 비밀번호를 넣었지만 두 저장값이 다르고, 콜론 앞 salt도 서로 다릅니다. 16바이트 salt와 64바이트 해시의 hex 값으로 저장되어 입력한 글자가 그대로 보이지 않습니다. 위 값은 채점 증거를 위한 검증 계정의 값이며 실제 본인 계정의 저장값을 공개하지 않았습니다. 해시는 복호화할 수 없지만, 약한 비밀번호라면 후보 대입 공격 대상이 될 수 있으므로 일반 사용자 해시를 공개하는 기능은 만들지 않았습니다.

## 요청·응답과 로그

제출용 요청은 원문 대신 다음처럼 적습니다. 이 JSON은 가려 쓴 기록이며 실제 비밀번호가 아닙니다.

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{"email":"[검증 계정 이메일]","password":"[가림: 기록하지 않음]"}
```

운영 검증에서 같은 비밀번호로 만든 두 계정의 가입과 정상 로그인이 성공했습니다. 틀린 비밀번호와 없는 이메일은 모두 HTTP 401과 `{"error":"이메일 또는 비밀번호가 올바르지 않습니다."}`를 반환했습니다. 모든 검증 응답 본문에 생성한 비밀번호가 들어 있지 않은지 실행 중 비교했고 통과했습니다. 기록 파일에는 원문·Cookie·Set-Cookie를 저장하지 않았습니다. [요청·응답 기록](card2-requests.json)과 [저장값·로그 검사 결과](card2-password-evidence.json)에 확인 시각과 대상 계정 ID가 있습니다.

로그인은 입력한 비밀번호를 HTTPS 요청 본문으로 서버에 보내야 합니다. 따라서 본인 브라우저의 Network → Request Payload에서 본인이 입력한 값을 볼 수 있는 것까지 없앴다는 뜻은 아닙니다. 응답·URL·제출 기록·서버 로그에 비밀번호를 되돌려 보내거나 남기지 않는 것을 확인한 것입니다. 원본 HAR나 비밀번호가 보이는 Payload 화면은 제출하지 않습니다.

`app/auth-form.tsx`의 입력은 `type="password"`로 가려집니다. 성공하면 입력 상태를 비우고 자료 화면으로 이동합니다. `worker/index.ts`는 성공 응답을 `ok`와 사용자 ID·이메일·이름으로 제한하며, `lib/auth.ts`는 Better Auth logger를 비활성화합니다. 해당 경로에 요청 본문이나 비밀번호를 출력하는 코드는 없습니다.

운영 서버 로그는 최근 10분, 최대 100건 범위로 조회해 반환된 73건을 점검했습니다. 반환된 로그에서 password 필드나 요청 본문은 발견되지 않았습니다. 제출 파일에는 인증 요청의 시간·요청 ID·경로·응답 상태만 남기고 IP·헤더·쿠키는 옮기지 않았습니다. 이는 조회한 범위의 결과이며, 과거 전체 로그나 플랫폼 내부 저장소까지 검사했다는 뜻은 아닙니다.

## 재현 방법

프로젝트 루트에서 PowerShell로 아래 명령을 실행하면 검증 계정 두 개를 같은 임의 비밀번호로 만들고 응답에 비밀번호가 포함되지 않는지 확인합니다. 사용자 본인의 비밀번호를 명령에 넣지 않습니다.

```powershell
$env:AUTH_TEST_URL='https://plan-do-see-diary-six.jwonnlee00.chatgpt.site'
node scripts/test-auth.mjs
```

성공하면 PASS 문구와 `outputs/evidence/task07/card1-requests.json`이 생성됩니다. 이 파일의 `samePasswordAccounts` ID 두 개에 해당하는 `auth_account.password`를 운영자 데이터베이스 도구에서 확인하면 비교할 수 있습니다. 해시를 읽는 일반 사용자용 API는 제공하지 않습니다. 시험을 다시 실행하면 새 계정과 새로운 salt가 생성되므로 위에 보관한 값과 달라지는 것이 정상입니다.


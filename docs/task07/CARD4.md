# 카드 4 — 계정 사이 자료 접근 차단

운영 주소에서 검증 계정 A와 B를 따로 만들고, 각각 계획 2건과 할 일 2건을 저장했습니다. 각 계정으로 반대 계정의 자료를 읽고 고치고 지우는 요청을 보냈고 모두 HTTP 404와 `{"error":"자료를 찾을 수 없습니다."}`를 받았습니다. 본인 계정과 실제 자료는 사용하지 않았습니다. 비밀번호와 쿠키 원문은 기록하지 않았고 두 검증 계정의 세션은 시험 끝에 로그아웃했습니다.

## 계정과 원본 자료

실제 계정 ID·계획 ID·할 일 ID, 초기 6개 표의 건수는 [운영 요청·응답 증거](card4-ownership.json)의 `seed`에 있습니다. 각 계정은 계획 2건, 할 일 2건을 저장하고 시험을 시작했습니다. 증거에는 검증용 데이터와 가린 쿠키만 포함했습니다.

## 양방향 요청

A → B와 B → A에서 다음 요청을 각각 실행했습니다. 이 앱의 수정은 PATCH 대신 POST를 사용합니다.

| 대상 | 읽기 | 수정 | 삭제 | 결과 |
| --- | --- | --- | --- | --- |
| 계획 | `GET /api/entries?history=[상대 계획 ID]` | `POST /api/entries`에 상대 계획 ID와 바꿀 제목 | `DELETE /api/entries`에 상대 계획 ID | 모두 404 |
| 할 일 | `GET /api/tasks?planId=[상대 계획 ID]` | `POST /api/tasks`에 상대 할 일 ID·계획 ID와 바꿀 제목 | `DELETE /api/tasks`에 상대 할 일 ID·version | 모두 404 |

다른 계정의 할 일 ID와 내 계획 ID를 섞어 보내는 수정, 다른 계정의 계획에 새 할 일을 넣는 생성도 양방향으로 시도했습니다. 각 방향 8건, 총 16건 모두 404와 같은 오류 본문으로 거절됐습니다.

증거 JSON의 `checks`에는 설명용 기호 대신 실제 검증 자료 ID가 들어 있는 URL·메서드·본문과 응답을 저장했습니다. 요청의 `Cookie`만 가렸습니다. 예를 들어 삭제 요청은 `DELETE /api/tasks`, 본문은 `{"id":"[상대 할 일 ID]","version":0}`이며 응답은 HTTP 404와 `{"error":"자료를 찾을 수 없습니다."}`입니다. 반대 방향에서도 같은 결과를 받았습니다.

## 거절 전후 비교

각 방향의 시험을 시작하기 전 상대 계정으로 `/api/export`를 요청해 `data` 전체를 보관했습니다. 각 거절 직후 상대 계정으로 다시 내보내 계획·계획 이력·할 일·실행·완료·다음 계획 연결의 6개 표를 깊은 비교로 검사했습니다. 시각이 바뀌는 `exportedAt` 같은 내보내기 메타데이터는 비교 대상에서 제외했습니다.

두 방향 모두 계획 2 → 2, 할 일 2 → 2였고 다른 표의 건수도 같았습니다. 내용·ID·버전도 모두 그대로였습니다. 증거 JSON의 `before/after` 기록에 표별 실제 건수와 `allSixTablesUnchanged: true`, `newForeignRows: 0`을 남겼습니다. 오류만 반환하고 자료는 바꾸는 동작이 없음을 각 요청 뒤 확인했습니다.

## URL·헤더·본문의 계정 위조

각 방향에서 상대 계정 ID를 다음 세 곳에 넣었습니다.

1. URL: `GET /api/entries?ownerId=[상대 ID]&userId=[상대 ID]&owner_id=[상대 ID]`
2. 같은 요청의 헤더: `X-User-Id: [상대 ID]`, `X-Owner-Id: [상대 ID]`
3. GET 본문: `{"ownerId":"[상대 ID]","userId":"[상대 ID]","owner_id":"[상대 ID]"}`

응답은 모두 HTTP 200이지만 위조 정보를 보내지 않은 본인 목록과 완전히 같았습니다. 모든 행의 ownerId가 요청자의 ID인지, 상대 계획 ID가 하나도 없는지 검사했습니다. GET 본문은 fetch가 허용하지 않아 Node HTTPS 클라이언트로 전송했습니다. 요청 본문과 실제 응답 전체는 증거 JSON에 있습니다.

계획 생성 POST 본문에도 상대의 ownerId·userId·owner_id와 위조 헤더를 넣었습니다. 서버는 HTTP 200으로 생성했지만 응답과 저장된 ownerId는 로그인한 본인 ID였습니다. 상대 계정의 내보내기 전체가 그대로인지 비교해 새 자료가 없음을 확인했습니다. 이 정상 생성 시험 때문에 마지막에는 각 검증 계정에 본인 계획이 1건씩 늘었습니다. 이는 앞서 거절한 요청의 결과와 구분합니다.

## 비로그인과 목록

Cookie 없이 `GET /api/entries`, `GET /api/tasks?planId=[실제 A 계획 ID]`, `GET /api/export`를 직접 요청했습니다. 모두 HTTP 401과 `{"error":"로그인이 필요합니다."}`를 반환했습니다.

각 계정의 전체 계획 목록은 ownerId가 모두 해당 계정이었습니다. 내보내기의 모든 계획도 본인 소유이고 모든 할 일은 그 계획에 속했습니다. 반대 계정의 계획·할 일 ID는 없었습니다. 증거에는 본인 목록의 전체 응답도 저장했습니다.

## 차단하는 소스

아래 고정 커밋 링크는 시험한 애플리케이션 코드 위치입니다.

- [worker/index.ts 25행](https://github.com/jwonnlee00-lab/repo/blob/12f6dba/worker/index.ts#L25): 서버에서 세션을 확인합니다. 26행은 비로그인 API를 401로 거절하고, 27행은 `authorizeApi(request, session.user.id)`가 거절하면 API 처리를 시작하기 전에 반환합니다. 48행에서 확인된 사용자 ID를 `runAsUser`에 넘깁니다.
- [lib/access.ts 9행](https://github.com/jwonnlee00-lab/repo/blob/12f6dba/lib/access.ts#L9): `ownPlan`이 계획 ID와 ownerId를 함께 검사합니다. 10행의 `ownTask`는 할 일을 계획에 JOIN해 주인을 확인합니다. 12~13행은 계획·할 일에 적용하고, 19행에서 공통 404를 반환합니다. 할 일 수정은 할 일과 계획 ID의 실제 연결도 확인합니다.
- [app/api/entries/route.ts 9행](https://github.com/jwonnlee00-lab/repo/blob/12f6dba/app/api/entries/route.ts#L9): 계획 목록의 DB 조회에 `entries.ownerId = currentUserId()` 조건을 붙입니다. 10행의 생성은 입력의 소유자 대신 서버의 currentUserId를 저장합니다. Zod 입력 형식에도 ownerId가 없습니다.
- [app/api/export/route.ts 6행](https://github.com/jwonnlee00-lab/repo/blob/12f6dba/app/api/export/route.ts#L6): 본인 계획 ID와 그 계획의 할 일 ID로 관련 자료를 제한합니다.
- [app/api/review/route.ts 5행](https://github.com/jwonnlee00-lab/repo/blob/12f6dba/app/api/review/route.ts#L5): 현재 사용자의 계획 ID 집합으로 집계 대상을 제한합니다. 이번 카드의 양방향 자동 시험 대상은 계획·할 일·목록·내보내기이며 이 소스 설명을 별도 돌아보기 시험과 혼동하지 않습니다.

## 재현

프로젝트 루트의 PowerShell에서 실행합니다. 실제 사용자 비밀번호를 명령에 넣지 않습니다.

```powershell
$env:AUTH_TEST_URL='https://plan-do-see-diary-six.jwonnlee00.chatgpt.site'
node scripts/test-ownership.mjs
```

모두 통과하면 PASS가 나오고 `outputs/evidence/task07/card4-ownership.json`이 생성됩니다. 허용되지 않은 요청이 성공하거나 상대 자료가 한 필드라도 달라지면 assertion 오류로 종료합니다. 시험할 때마다 검증 계정과 자료가 생성됩니다. 이는 지정한 요청을 검증한 결과이며 모든 가능한 공격을 포괄한 감사라는 뜻은 아닙니다.

# vscode-teletype

**Teletype for VisualStudio Code and Theia and Code-Server**

---

<p align="center">
  <p align="center">
    <a href="README.md">English</a>
    ·
    <a href="README_kr.md">한국어</a>
  </p>
</p>

---

## Eclipse Che에서 Teletype 실행

workspaces 페이지 탭 클릭

workspaces 페이지가 나타난다.

Add Workspace 버튼을 클릭한다

Create Workspace 페이지 나타난다.

Devfile 항목에 텍스트 박스가 나타난다.

Devfile 항목의 텍스트 박스에 다음의 내용을 입력한다.

Create&Open 버튼을 클릭한다.

> data
```yaml
apiVersion: 1.0.0
metadata: 
  name: Teletype-test-1
  projects:
    - name: official-testcase-spring1
      source:     
        location: 'https://code.sdsdev.co.kr/cloud-ide/official-testcase-spring1.git'
        type: github
components:
  - id: sds/Teletype/0.0.1
    type: chePlugin
```

RECENT WORKSPACES 항목에 Teletype-1 항목이 나타난다.
Teletype-1 항목의 색이 녹색으로 변한다.
일정 시간이 경과한 후 우측에 theia 화면이 나타난다.
theia 왼쪽 페이지에 Teletype 항목이 나타난다.

Teletype 탭을 클릭하면 Teletype 페이지로 전환된다.

![Teletype 시작 화면](images/start_01.png)

각 뷰의 요소는 다음과 같다.

![Teletype 시작 화면](images/start_02.png)

> **1 - Teletype 페이지탭**  
> Teletype 페이지로 전환
> 
> **2 - Teletype Accounts**  
> Teletype 접속 정보 및 계정 정보
> 
> **3 - Teletype Target Documents**  
> 현재 공유 중인 에디터 목록


## Teletype Sign-in

상단의 Teletype Accounts 뷰의 Signin 버튼을 누른다.
그럼 user id 입력 받는 입력박스가 나타난다.

![](images/signin_01.png)


유저 이름을 입력하고 enter를 누른다.  
접속이 성공적으로 이루어지면 Teletype Accounts 뷰에서 Signin 버튼이 사라지고 접속한 유저의 이름이 표시된다.

![](images/signin_02.png)


## Teletype Signout

Teletype Accounts 뷰의 user 이름 항목을 우클릭하여 팝업 메뉴를 호출한다.

![](images/signout_01.png)

팝업 메뉴 중, Signout Teletype 을 클릭한다.
그럼 Teletype Accounts 뷰의 tree에서 계정 항목이 사라지고 다시 Signin 버튼이 나타난다.

![](images/signout_02.png)


## 소스를 공유하기 (Host)

현재 자신의 Workspace 상의 소스를 공유하고자 한다면 먼저 Host로서 공유 Portal을 생성하고 그 Portal을 공개해야 한다. 그럼 다른 유저들이 해당 Portal에 접속하여 Guest로서 참여하여 Host가 제공하는 소스를 공유할 수 있게 된다.

공유 Portal을 생성하려면 Teletype Accounts 뷰에서 유저 이름 항목을 우클릭하여 팝업 메뉴를 호출한다.

![](images/share_01.png)

팝업 메뉴 중 Shared Portal를 선택하여 Portal을 생성한다. 성공적으로 Portal이 생성되면 팝업 메시지와 함께 Teletype Accounts 뷰에 Host 항목이 추가된다.

![](images/share_02.png)

Host 항목의 하단에 현재의 유저 이름이 기본으로 추가된다.  
또한 생성된 Portal의 접속 URL이 클립보드로 들어가게 되는데, 이를 적절한 방법으로 공유하고자 하는 유저들에게 전달하면 된다. (ex. 메신저, e-Mail, etc...)


## 공유 Portal URL을 클립보드로 복사

만약 작업 도중에 새로운 사용자에게 공유 Portal의 접속 URL을 전송해야 할 경우가 생긴다면 클립보드를 통해 해당 URL을 얻을 수 있다.

먼저 Teletype Accounts 뷰에서 Host 항목을 우클릭하여 팝업 메뉴를 호출한다.

![](images/copy_url_01.png)

팝업 메뉴 중 Copy Portal url to clipboard 항목을 클릭하면 팝업 메시지가 표시되며 Portal의 접속 URL이 클립보드로 복사된다.

![](images/copy_url_02.png)

> ***Info:*** 이 작업은 Portal의 Host 유저만이 가능하다.


## 공유 Portal에 Guest로 접속

이미 생성 된 공유 Portal에 Guest로서 참여하여 Host 유저가 제공하는 소스를 열람하기 위해서는 사전에 다른 유저가 해당 Portal의 접속 URL을 알고 있어야 한다. 이 접속 URL은 Host 유저가 임의의 방법(ex. 메신저, e-Mail, etc...)으로 다른 유저들에게 전달해 주어야 한다.
공유 Portal의 URL을 알고 있다면, Teletype 접속 후 해당 Portal에 접속하면 됩니다.

Teletype Accounts 뷰에서 Signin 된 유저 이름 항목을 우클릭 하여 팝업 메뉴를 호출한다.

![](images/join_01.png)

팝업 메뉴 중, Join to Portal을 선택하면 Portal URL 입력 창이 나타난다.  
입력창에 Portal URL을 입력하고 enter를 누른다.

![](images/join_02.png)

성공적으로 Portal에 접속이 되었다면 Teletype Accounts 뷰에 Portal Id 항목이 나타나고, 그 아래에 Host 유저의 이름과 현재 Signin 된 유저 이름이 함께 나타난다.

![](images/join_03.png)

> ***info:*** 만약 Host 유저가 편집 중인 파일이 존재한다면 해당 파일의 소스가 함께 에디터로 열리게 된다.



## 팔로잉 대상의 에디터 변경 동기화

Teletype의 기본 사용 패턴은 서로 다른 유저가 같은 소스를 동시에 열람하는 것이다. 때문에 한 유저가 편집 대상 소스를 다른 파일로 변경했을 때 다른 유저 역시 즉각적으로 해당 소스를 함께 열람할 수 있어야 한다. 이때 소스의 대상을 가리키는 유저를 **리더**라고 부르고 이 소스를 열람하는 유저를 **팔로어**라 부른다.  
기본적으로 초기엔 소스를 공개하는 Host가 디폴트로 리더가 되어 있고, 다른 Guest는 모두 이 리더를 팔로잉하게 된다.  
하지만 필요에 따라 이 리더의 대상 소스의 변경을 계속 팔로잉하는 것이 불필요해지는 경우도 있다. 이럴 땐 팔로잉을 끊으면 된다. 유저가 명시적으로 팔로잉을 끊을 수도 있지만, 에디터 조작하는 상황에 따라서 Teletype이 지능적으로 팔로잉을 끊을 수도 있다.  
또한 계속 복수의 유저가 동시에 Portal에 접속한 상태에서는 자신이 주목하고자 하는 특정 유저를 골라서 팔로어가 될 수도 있다.

> ***info:*** Host 유저는 기본적으로 리더만 될 수 있을 뿐, 팔로어는 될 수 없다.

초기 Portal에 접속한 상태에선 Teletype Accounts 뷰에 Host 유저의 이름 옆에 '*' 문자가 표시되어 있다. 이는 현재 팔로잉하는 대상이 Host 유저임을 나타낸다.

![](images/follow_01.png)

이 상태에서는 Host 유저가 편집할 파일을 열거나 편집 중인 대상 파일을 변경하면 즉시 해당 파일에 해당하는 에디터가 함께 열리게 된다.

만약 팔로잉을 끊고 싶다면 Teletype Accounts 뷰에 Host 유저 이름에서 마우스 우클릭을 하여 팝업 메뉴를 호출한다.

![](images/follow_02.png)

팝업 메뉴 중 Unflollow Portal을 클릭하면 Unfollow 되었다라는 팝업 메시지와 함께 Host 유저 이름의 옆에 ‘*’ 표시가 사라진다.

![](images/follow_03.png)

이 상태에서는 Host 유저가 새로운 파일을 열거나 편집 중인 에디터를 변경해도 Guest 유저의 화면에서 즉각적으로 해당 에디터가 함께 열리지 않게 된다.

다시 특정 유저의 공유 파일 편집 상태를 팔로잉하고자 한다면 해당 유저를 리더로 지정하면 된다. 반드시 Host 유저 뿐 아니라 복수의 유저가 접속했을 경우, 임의의 유저도 리더로 지정하는 것이 가능하다.

Teletype Accounts 뷰에서 팔로잉하고자 하는 유저의 아이디를 우클릭해서 팝업 메뉴를 호출한다.

![](images/follow_04.png)

Flollow Portal을 클릭하게 되면 팔로잉했다라는 메시지가 출력되면 해당 유저의 우측에 '*' 문자가 나타나게 된다. 또한 현재 해당 에디터가 편집하고 있던 소스가 있다면 해당 파일도 즉각적으로 표시되게 된다.

![](images/follow_05.png)



## Host 모드에서 에디터 열기

왼쪽 페이지 탭에서 Explorer 탭을 선택한다.

Explorer 탭으로 전환된다.

현재 워크스페이스의 디렉토리 구조와 파일 목록이 나열된다.

임의의 텍스트 파일을 골라 더블클릭한다.

에디트 영역에 해당 텍스트 파일이 열린다.

왼쪽 페이지 탭에서 Teletype 탭을 선택한다.

Teleteype 탭으로 전환된다.

Teletype target documents 뷰에 현재 워크스페이스에서 열린 텍스트 에디터의 목록이 나열된다.

Guest로 join한 다른 web-ide 워크스페이스로 전환한다.

Host에서 연 텍스트 파일과 동일한 내용의 에디터가 열려 있다.

Teletype target documents 뷰에 현재 Host에서 연 텍스트 에디터의 목록이 동일하게 나열된다.




## 에디터의 커서 위치 변경

문서의 특정 위치로 마우스를 클릭한다.

커서의 위치가 해당 위치로 이동된다.

![](images/cursor_01.png)

Host 모드에서 연 문서에 해당하는 에디터가 에디터 영역에 표시되어 있다.
Host 모드의 에디터에서의 커서 위치에 마크가 되어 있으며, Host 모드의 유저 아이디가 표기되어 있다.

Host 모드의 에디터에서의 이동한 새로운 커서 위치에 마크가 되어 있으며, Host 모드의 유저 아이디가 표기되어 있다.

![](images/cursor_02.png)


Host 모드의 Teletype이 포함 된 워크스페이스에서 열려 있는 에디터를 선택한다.

마우스로 드래그하여 텍스트 영역의 일부를 선택한다.

![](images/cursor_03.png)


마우스로 드래그 한 영역이 블럭으로 선택된다.

Guest 모드의 Teletype이 포함 된 워크스페이스로 이동한다.

Host 모드에서 선택한 영역과 동일한 영역에 마커가 칠해져 있다.

![](images/cursor_04.png)



## 편집 동기화

Host 모드의 Teletype이 포함 된 워크스페이스에서 열려 있는 에디터를 선택한다.

에디터의 임의의 위치로 커서를 이동한다.

임의의 텍스트 내용을 입력한다.

![](images/edit_01.png)

Guest 모드의 Teletype이 포함 된 워크스페이스로 이동한다.

![](images/edit_02.png)

Host 모드에서 연 파일과 동일한 파일의 에디터가 열려 있다.

Host 모드에서 추가한 텍스트가 동일하게 입력되어 있다.

새롭게 입력한 텍스트의 마지막 위치에 커서 마커가 표시되며 Host 유저 이름이 표시되어 있다.



## 서로 다른 파일을 편집하고 있을 떄 동기화

Guest 모드의 Teletype이 포함 된 워크스페이스에서 열려 있는 에디터를 선택한다.

Host에서 연 에디터가 나타난다.

에디터 목록 중 현재 활성화 된 것과 다른 에디터 탭을 선택한다.

다른 에디터가 활성화 된다.

Teletype Accounts 뷰의 Host 유저 이름 옆의 ‘*’가 사라진다.

![](images/lazy_sync_01.png)


텍스트 에디터에 임의의 문자를 입력한다.

새로 입력한 내용을 반영하여 텍스트 내용이 변경된다.

Host 모드의 Teletype이 포함 된 워크스페이스를 활성화 한다.

Guest 모드와 다른 에디터가 활성화 되어 있다.

![](images/lazy_sync_02.png)

Teletype target documents 뷰에 Guest 모드에서 활성화 된 에디터에 해당하는 파일명의 옆에 ‘*’ 문자가 나타난다.

Teletype target documents 뷰에 나타난 파일명 중 ‘*’ 문자가 붙은 항목을 클릭한다.

선택 된 파일명에 해당하는 텍스트 에디터가 활성화 된다.

Guest에서 변경한 내용이 반영되어 텍스트 내용이 변경 된다.

Teletype target documents 뷰에 나타난 해당 에디터의 파일명 옆의 ‘*’ 문자가 사라진다.

![](images/lazy_sync_03.png)



## Guest 접속 종료

Guest 유저가 소스 열람을 끝내고 싶다면 Portal의 접속을 끊으면 된다.

Teletype Accounts 뷰의 Host ID 항목을 마우스 우클릭하여 팝업 메뉴를 호출한다.

![](images/leave_01.png)

팝업 메뉴에서 Leave Portal을 클릭하면 접속을 종료하게 된다.  
접속 종료가 완료되면 Teletype Accounts 뷰에서 Host의 ID 항목이 사라진다. 또한 열람 중인 공유 소스의 목록이 표시되던 Teletype Target Documents 뷰의 목록 중에 해당 Portal의 소스들은 사라지게 된다.

![](images/leave_02.png)



## Teletype Host 닫기

Host 유저가 더이상 소스 공유를 중단하고 싶다면 Portal을 닫으면 된다.

Teletype Accounts 뷰에서 Host 항목을 우클릭 하여 팝업 메뉴를 호출한다.

![](images/close_portal_01.png)

팝업 메뉴 중 Close Host Portal 항목을 클릭하면 접속이 종료 되었다는 팝업 메시지가 출력되며, Teletype Accounts 뷰에서 Host 항목이 사라진다. 또한 현재 공유 중인 에디터의 목록에서도 모든 항목들이 사라진다.

![](images/close_portal_02.png)

Host 유저가 Portal을 닫을 땐 한가지 주의 사항이 있다. 바로 Guest 유저가 편집 한 내용이 아직 반영되지 않은 상태에서 종료를 하면 편집 내용을 잃게 된다는 점이다.  
일례로, 현재 Host 유저와 Guest 유저의 팔로잉이 끊긴 상태에서 Guest 유저가 Host에게 보이지 않는 에디터의 내용을 편집 중인 상태를 가정해 보자.  
그럼 Guest 유저의 Teletype Accounts 뷰에서는 팔로잉을 표시하는 '*' 문자가 사라져 있을 것이다. 
이 상태에서 Guest와 Host가 서로 다른 에디터를 바라보고 있을 수가 있다. 이때 Guest가 문서의 내용을 편집한다면 Host 유저의 Teletype Target Documents 뷰에는 Guest가 편집 중인 파일명의 옆에 '*' 표시가 나타난다.

![](images/close_portal_03.png)

이때 Host 유저가 워크스페이스의 공유를 중단하고 Portal을 닫으려고 시도하려면 팝업 메뉴를 통해 종료 명령을 내리면 된다.

![](images/close_portal_04.png)


만약 이때 미반영 된 편집 내용이 있다는 경고 메시지와 함께 종료 확인 팝업창이 나타난다.

![](images/close_portal_05.png)

만약 여기서 Yes를 누른다면 Portal이 정상적으로 종료되지만 대신 미반영 된 편집 내용은 잃게 된다.
미반영 된 내용을 확인하고 적용한 이후에 다시 종료 절차를 밟고 싶다면 No를 누르면 된다. 그 경우 팝업창이 닫히고 종료 절차가 취소된다.

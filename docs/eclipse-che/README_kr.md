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

Eclipse Che에서 Teletype을 사용하기 위해서는 Devfile에 플러그인을 추가해 주면 된다.  
플러그인 포맷은 다음과 같다.

```yaml
apiVersion: v2
publisher: Amos
name: teletype
category: Language
type: VS Code extension
description: Teletype for Visual Studio Code
displayName: Teletype
firstPublicationDate: "2023-01-01"
icon: https://github.com/amos42/vscode-teletype/blob/master/resources/teletype.svg
repository: https://github.com/amos42/vscode-teletype
version: 0.0.1
spec:
  extensions:
  - 'https://my-plugin-server/repository/vscode-teletype-0.0.1.vsix'
```

Add Workspace를 클릭하여 워크스페이스를 생성하기 위한 Devfile 입력 박스가 나타면 다음의 내용을 입력한다.

```yaml
apiVersion: 1.0.0
metadata:
   name: Teletype_test_1
   projects:
     - name: sample_001
       source:
         location: 'https://my-project-server/samples/sample_001.git'
         type: github
components:
   - reference: 'https://my-plugin-server/teletype/latest/plugin.yaml'
     type: chePlugin
```

그리고 Create & Open 버튼을 클릭하면 생성 된 IDE에 Teletype이 설치되어 동작하게 된다.  
정상적으로 Teletype이 설치되었다면 IDE의 페이지탭에 Teletype 아이콘이 표시된다.

![Teletype 시작 화면](images/start_01.png)

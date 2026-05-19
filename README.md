# Futures Journal — Emergency Brake Chrome Extension

비트겟 PC 거래창에서 진입 버튼 클릭 직전 강제 경고를 표시하는 크롬 확장.

## 개발자 모드 설치

1. `chrome://extensions/` 접속
2. 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램 로드** 클릭
4. 이 폴더(`futures-journal-extension`) 선택

## 토큰 등록

1. [Futures Journal 사이트](https://futures-journal-virid.vercel.app) 로그인
2. `/settings/extension` 에서 **확장 토큰 발급**
3. 크롬 확장 팝업 아이콘 클릭 → 토큰 붙여넣기

## 패키징

```powershell
npm run pack
```

`futures-journal-extension.zip` 생성됨.

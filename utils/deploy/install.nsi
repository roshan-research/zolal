;Include Modern UI
	!include "MUI2.nsh"

;General
	;Name and file
	Name "زلال"
	OutFile "Zolal.exe"

	;Default installation folder
	InstallDir "$PROGRAMFILES\Zolal"

	;Get installation folder from registry if available
	InstallDirRegKey HKCU "Software\Zolal" ""

	SetCompressor /SOLID lzma
	BrandingText " "

	;Interface Settings
	!define MUI_ABORTWARNING
	!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\orange-uninstall.ico"

;Pages
	!insertmacro MUI_PAGE_WELCOME
	!insertmacro MUI_PAGE_DIRECTORY
	!insertmacro MUI_PAGE_INSTFILES
	!insertmacro MUI_PAGE_FINISH

	!insertmacro MUI_UNPAGE_WELCOME
	!insertmacro MUI_UNPAGE_CONFIRM
	!insertmacro MUI_UNPAGE_INSTFILES
	!insertmacro MUI_UNPAGE_FINISH

;Languages
	!insertmacro MUI_LANGUAGE "Farsi"

;Installer Sections
Section
	;Files
	SetOutPath $INSTDIR
	File /r "app\*.*"

	;ShortCuts
	SetOutPath $INSTDIR
	CreateShortCut "$SMPROGRAMS\Programs\Zolal\Zolal.lnk" "$INSTDIR\app.exe"
	CreateShortCut "$DESKTOP\Zolal.lnk" "$INSTDIR\app.exe"

	;Programs
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zolal" "DisplayName" "Zolal"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zolal" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zolal" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"

	;Store installation folder
	WriteRegStr HKCU "Software\Zolal" "" $INSTDIR

	;Create uninstaller
	WriteUninstaller "$INSTDIR\Uninstall.exe"

SectionEnd

;Uninstaller Section
Section "Uninstall"
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Zolal"
	DeleteRegKey /ifempty HKCU "Software\Zolal"
	Delete "$SMPROGRAMS\Programs\Zolal\Zolal.lnk"
	Delete "$DESKTOP\Zolal.lnk"

	Delete "$INSTDIR\*.*"
SectionEnd

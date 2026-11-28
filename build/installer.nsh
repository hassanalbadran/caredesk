; CareDesk installer extras (electron-builder `nsis.include`).
; Installs a second desktop + Start-menu shortcut for CareDesk Doctor (repair tool). The Doctor files are copied to $INSTDIR\Doctor by `extraFiles` in package.json.
; Keep this file ASCII. To get an Arabic shortcut name, save the file as UTF-8 WITH BOM and change DOCTOR_NAME.
!define DOCTOR_NAME "CareDesk Doctor"
!define DOCTOR_ARGS '-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "$INSTDIR\Doctor\CareDeskDoctor.ps1"'

!macro customInstall
  CreateShortCut "$DESKTOP\${DOCTOR_NAME}.lnk" "$WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" '${DOCTOR_ARGS}' "$INSTDIR\Doctor\doctor.ico" 0 SW_SHOWMINIMIZED "" "CareDesk repair tool"
  CreateShortCut "$SMPROGRAMS\${DOCTOR_NAME}.lnk" "$WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" '${DOCTOR_ARGS}' "$INSTDIR\Doctor\doctor.ico" 0 SW_SHOWMINIMIZED "" "CareDesk repair tool"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\${DOCTOR_NAME}.lnk"
  Delete "$SMPROGRAMS\${DOCTOR_NAME}.lnk"
!macroend

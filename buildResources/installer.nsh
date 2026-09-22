!macro customInstall
  DetailPrint "Cleaning up legacy and duplicate shortcuts..."
  # Clean up duplicate per-user shortcuts so only the single system-wide shortcut remains
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\BunsenWorship.lnk"
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\Bunsen Worship.lnk"
  Delete "$DESKTOP\Bunsen Worship.lnk"
  Delete "$COMMONDESKTOP\Bunsen Worship.lnk"
  Delete "$SMPROGRAMS\Bunsen Worship.lnk"
  Delete "$COMMONPROGRAMS\Bunsen Worship.lnk"
!macroend

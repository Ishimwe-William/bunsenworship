!macro customInstall
  DetailPrint "Cleaning up legacy and duplicate shortcuts..."
  # Clean up duplicate per-user shortcuts from user profile
  SetShellVarContext current
  Delete "$SMPROGRAMS\BunsenWorship.lnk"
  Delete "$SMPROGRAMS\Bunsen Worship.lnk"
  Delete "$DESKTOP\Bunsen Worship.lnk"

  # Clean up legacy space-separated machine-wide shortcuts
  SetShellVarContext all
  Delete "$SMPROGRAMS\Bunsen Worship.lnk"
  Delete "$DESKTOP\Bunsen Worship.lnk"
!macroend

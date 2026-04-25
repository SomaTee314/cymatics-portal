# Run from repo root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/publish-to-live.ps1
# 1) Rebuilds portal (index.html + public/cymatics)  2) Commits if anything changed  3) Pushes  4) Vercel production
# Save all editor tabs first. .env.local stays gitignored.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "==> npm run prebuild" -ForegroundColor Cyan
npm run prebuild
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> git add -A" -ForegroundColor Cyan
git add -A
$st = git status --porcelain
if ($st) {
  Write-Host "==> commit" -ForegroundColor Cyan
  git commit -m "chore: sync prebuild and source for live deploy"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "(nothing to commit)" -ForegroundColor Yellow
}

Write-Host "==> git push origin main" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> npx vercel --prod --yes" -ForegroundColor Cyan
npx vercel --prod --yes
exit $LASTEXITCODE

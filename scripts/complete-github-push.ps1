# Complete GitHub remote + first push. Requires: gh auth (run `gh auth login` once), or set GH_TOKEN.
# Usage: from repo root: powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/complete-github-push.ps1
#    Optional: $env:GITHUB_NEW_REPO = "owner/repo" (default: authenticated user + cymatics-portal)

$ErrorActionPreference = "Continue"
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
    $ghPath = "C:\Program Files\GitHub CLI\gh.exe"
    if (Test-Path $ghPath) { $env:Path = (Split-Path $ghPath) + ";" + $env:Path }
}

$null = & gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub CLI is not logged in. From this project folder, run: gh auth login"
    Write-Host "Then re-run: npm run github:push"
    exit 1
}

$hasOrigin = [bool](git config --get remote.origin.url 2>$null)

if ($hasOrigin) {
    $u = git remote get-url origin 2>$null
    Write-Host "Remote 'origin' already set: $u"
    git push -u origin main
    exit $LASTEXITCODE
}

$defaultName = "cymatics-portal"
if ($env:GITHUB_NEW_REPO) {
    $name = $env:GITHUB_NEW_REPO
} else {
    $name = $defaultName
}

Write-Host "Creating GitHub repository '$name' and pushing main..."
gh repo create $name --public --source=. --remote=origin --push
exit $LASTEXITCODE

# Publishes Sift to Vercel (production) using an access token you paste in.
# The token is read without being shown and is used only for this one run; it is never saved to disk.
# Run from the project root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-vercel.ps1
# Create a token at https://vercel.com/account/settings/tokens (a short expiry is fine).
# Not 'Stop': the Vercel CLI writes its banner and progress to stderr, which Windows PowerShell would treat as fatal.
# Failures are detected from each command's exit code instead.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)

$secure = Read-Host -AsSecureString 'Paste your Vercel token (it will not be shown)'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
if (-not $token) { Write-Output 'No token entered; nothing was published.'; exit 1 }

$vercel = @('--yes', 'vercel@65.17.0')
$project = 'sift-analyzer'   # The folder name has capitals and a space, which Vercel doesn't accept.

# Link this folder to the Vercel project, creating the project the first time.
if (-not (Test-Path '.vercel\project.json')) {
  Write-Output "Setting up the Vercel project '$project'..."
  & npx.cmd @vercel project add $project --token $token   # Fails harmlessly if it already exists.
  & npx.cmd @vercel link --yes --project $project --token $token
  if ($LASTEXITCODE -ne 0) { Write-Output 'Could not link the project; nothing was published.'; exit 1 }
}

Write-Output 'Uploading and building on Vercel. This takes a few minutes...'
& npx.cmd @vercel deploy --prod --yes --token $token
$code = $LASTEXITCODE
$token = $null
if ($code -eq 0) { Write-Output 'Published.' } else { Write-Output "Vercel reported an error (exit code $code)." }
exit $code

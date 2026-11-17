# Publishes Sift to Vercel (production) using an access token you paste in.
# The token is read without being shown and is used only for this one run; it is never saved to disk.
#
# If .env.local holds the Supabase URL and publishable key, they are copied to the Vercel project's
# production settings first, so accounts and Google sign-in work on the live site.
#
# Run from the project root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-vercel.ps1
# Create a token at https://vercel.com/account/settings/tokens (a short expiry is fine).

# Not 'Stop': the Vercel CLI writes its banner and progress to stderr, which Windows PowerShell would treat as fatal.
# Failures are detected from each command's exit code instead.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)

$siteUrl = 'https://sift-analyzer-pi.vercel.app'
$vercel = @('--yes', 'vercel@65.17.0')
$project = 'sift-analyzer'   # The folder name has capitals and a space, which Vercel doesn't accept.

$secure = Read-Host -AsSecureString 'Paste your Vercel token (it will not be shown)'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
if (-not $token) { Write-Output 'No token entered; nothing was published.'; exit 1 }

# Link this folder to the Vercel project, creating the project the first time.
if (-not (Test-Path '.vercel\project.json')) {
  Write-Output "Setting up the Vercel project '$project'..."
  & npx.cmd @vercel project add $project --token $token   # Fails harmlessly if it already exists.
  & npx.cmd @vercel link --yes --project $project --token $token
  if ($LASTEXITCODE -ne 0) { Write-Output 'Could not link the project; nothing was published.'; exit 1 }
}

# Copy the public Supabase settings from .env.local to Vercel (production), replacing any old values.
function Read-EnvLocal([string]$name) {
  if (-not (Test-Path '.env.local')) { return $null }
  foreach ($line in Get-Content '.env.local') {
    if ($line -match "^\s*$name\s*=\s*(.*)\s*$") { return $Matches[1].Trim().Trim('"').Trim("'") }
  }
  return $null
}
function Set-VercelEnv([string]$name, [string]$value) {
  & npx.cmd @vercel env rm $name production --yes --token $token 2>$null | Out-Null
  $value | & npx.cmd @vercel env add $name production --token $token
  if ($LASTEXITCODE -ne 0) { Write-Output "Could not save $name to Vercel; nothing was published."; exit 1 }
}

$supabaseUrl = Read-EnvLocal 'NEXT_PUBLIC_SUPABASE_URL'
$supabaseKey = Read-EnvLocal 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
if ($supabaseUrl -and $supabaseKey -and $supabaseUrl -notmatch 'your-project-ref') {
  Write-Output 'Copying the Supabase settings from .env.local to Vercel...'
  Set-VercelEnv 'NEXT_PUBLIC_SUPABASE_URL' $supabaseUrl
  Set-VercelEnv 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' $supabaseKey
  Set-VercelEnv 'NEXT_PUBLIC_SITE_URL' $siteUrl
} else {
  Write-Output 'No Supabase settings in .env.local yet, so the live site keeps showing "Accounts are coming soon".'
}

Write-Output 'Uploading and building on Vercel. This takes a few minutes...'
& npx.cmd @vercel deploy --prod --yes --token $token
$code = $LASTEXITCODE
$token = $null
if ($code -eq 0) { Write-Output "Published: $siteUrl" } else { Write-Output "Vercel reported an error (exit code $code)." }
exit $code

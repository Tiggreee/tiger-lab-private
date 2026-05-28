param(
  [Parameter(Mandatory=$true)] [string]$Name,
  [Parameter(Mandatory=$true)] [string]$Template
)

$src = Join-Path "templates" $Template
$dest = Join-Path "projects" $Name

if (-not (Test-Path $src)) {
  throw "Template not found: $Template"
}

if (Test-Path $dest) {
  throw "Destination already exists: $dest"
}

New-Item -ItemType Directory -Path "projects" -Force | Out-Null
Copy-Item -Path $src -Destination $dest -Recurse
Write-Host "Project created at $dest"

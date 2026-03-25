$ErrorActionPreference = 'Stop'
$srcKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZHVjdnZjanpkcG9vanhsc2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3ODA3NCwiZXhwIjoyMDg1NjU0MDc0fQ.Nn29Q8R9XVpymbX1I91sPgHpzKUHBXKtAzd566AcQhQ'
$dstKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXljZnF4Z3RyemF5c2dwem14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMxNjUwOCwiZXhwIjoyMDg5ODkyNTA4fQ.UOgM2ize3BmcaaxKtG8oLJqpcR9iulfubRkvePcFSe0'
$srcBase = 'https://ykducvvcjzdpoojxlsig.supabase.co'
$dstBase = 'https://ejiycfqxgtrzaysgpzmx.supabase.co'
$csvPath = 'tmp/db-transfer/storage_objects.csv'
$tempDir = 'tmp/db-transfer/storage-files'
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
function Encode-StoragePath([string]$path) {
  return (($path -split '/') | ForEach-Object { [System.Uri]::EscapeDataString($_) }) -join '/'
}
$rows = Import-Csv $csvPath
$total = $rows.Count
$index = 0
foreach ($row in $rows) {
  $index++
  $encoded = Encode-StoragePath $row.name
  $downloadUrl = "$srcBase/storage/v1/object/$($row.bucket_id)/$encoded"
  $uploadUrl = "$dstBase/storage/v1/object/$($row.bucket_id)/$encoded"
  $tempFile = Join-Path $tempDir ([guid]::NewGuid().ToString())
  Invoke-WebRequest -Headers @{apikey=$srcKey; Authorization="Bearer $srcKey"} -Uri $downloadUrl -OutFile $tempFile | Out-Null
  Invoke-RestMethod -Method Post -Headers @{apikey=$dstKey; Authorization="Bearer $dstKey"; 'x-upsert'='true'; 'cache-control'=$row.cache_control } -Uri $uploadUrl -InFile $tempFile -ContentType $row.mimetype | Out-Null
  Remove-Item $tempFile -Force
  if (($index % 20) -eq 0 -or $index -eq $total) { Write-Output ("copied {0}/{1}" -f $index, $total) }
}
